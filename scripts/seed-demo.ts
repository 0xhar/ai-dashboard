/* eslint-disable @typescript-eslint/no-require-imports */
// Must run BEFORE any @/lib imports that read process.env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

// Model definitions with pricing per 1M tokens (in cents)
const MODELS = {
  openai: [
    {
      name: 'gpt-4o',
      inputPriceCents: 250,
      outputPriceCents: 1000,
      weight: 0.4,
    },
    {
      name: 'gpt-4o-mini',
      inputPriceCents: 15,
      outputPriceCents: 60,
      weight: 0.5,
    },
    {
      name: 'gpt-4-turbo',
      inputPriceCents: 1000,
      outputPriceCents: 3000,
      weight: 0.1,
    },
  ],
  anthropic: [
    {
      name: 'claude-sonnet-4-20250514',
      inputPriceCents: 300,
      outputPriceCents: 1500,
      weight: 0.5,
    },
    {
      name: 'claude-haiku-3-20240307',
      inputPriceCents: 25,
      outputPriceCents: 125,
      weight: 0.4,
    },
    {
      name: 'claude-opus-4-20250514',
      inputPriceCents: 1500,
      outputPriceCents: 7500,
      weight: 0.1,
    },
  ],
  aws_bedrock: [
    {
      name: 'anthropic.claude-3-sonnet',
      inputPriceCents: 300,
      outputPriceCents: 1500,
      weight: 0.5,
    },
    {
      name: 'amazon.titan-text-express',
      inputPriceCents: 20,
      outputPriceCents: 60,
      weight: 0.3,
    },
    {
      name: 'meta.llama3-70b',
      inputPriceCents: 99,
      outputPriceCents: 99,
      weight: 0.2,
    },
  ],
} as const;

const TEAM_CONFIG = [
  {
    name: 'Engineering',
    slug: 'engineering',
    budgetCents: 5000_00,
    share: 0.45,
  },
  { name: 'Marketing', slug: 'marketing', budgetCents: 2000_00, share: 0.2 },
  {
    name: 'Data Science',
    slug: 'data-science',
    budgetCents: 3000_00,
    share: 0.25,
  },
  { name: 'Product', slug: 'product', budgetCents: 1000_00, share: 0.1 },
];

function randomVariance(base: number, variance: number): number {
  return Math.round(base * (1 + (Math.random() - 0.5) * 2 * variance));
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

async function seed() {
  // Dynamic imports so dotenv runs first
  const { db } = await import('@/lib/db');
  const schema = await import('@/lib/db/schema');
  const { encrypt } = await import('@/lib/crypto/encryption');
  const { hashSync } = await import('bcryptjs');
  const { sql } = await import('drizzle-orm');

  console.log('Clearing existing data...');
  await db.execute(sql`TRUNCATE TABLE sync_jobs CASCADE`);
  await db.execute(sql`TRUNCATE TABLE budget_alerts CASCADE`);
  await db.execute(sql`TRUNCATE TABLE cost_records CASCADE`);
  await db.execute(sql`TRUNCATE TABLE usage_records CASCADE`);
  await db.execute(sql`TRUNCATE TABLE team_provider_mappings CASCADE`);
  await db.execute(sql`TRUNCATE TABLE team_memberships CASCADE`);
  await db.execute(sql`TRUNCATE TABLE teams CASCADE`);
  await db.execute(sql`TRUNCATE TABLE provider_connections CASCADE`);
  await db.execute(sql`TRUNCATE TABLE org_memberships CASCADE`);
  await db.execute(sql`TRUNCATE TABLE users CASCADE`);
  await db.execute(sql`TRUNCATE TABLE organizations CASCADE`);

  // 1. Organization
  console.log('Creating organization...');
  const [org] = await db
    .insert(schema.organizations)
    .values({ name: 'Acme Corp', slug: 'acme-corp', plan: 'pro' })
    .returning();

  // 2. Users
  console.log('Creating users...');
  const passwordHash = hashSync('demo-password-123', 10);
  const [user1] = await db
    .insert(schema.users)
    .values({
      email: 'admin@acme.com',
      name: 'Alice Admin',
      passwordHash,
      emailVerified: true,
    })
    .returning();

  const [user2] = await db
    .insert(schema.users)
    .values({
      email: 'member@acme.com',
      name: 'Bob Member',
      passwordHash,
      emailVerified: true,
    })
    .returning();

  // 3. Org memberships
  await db.insert(schema.orgMemberships).values([
    { userId: user1.id, orgId: org.id, role: 'owner' },
    { userId: user2.id, orgId: org.id, role: 'member' },
  ]);

  // 4. Teams
  console.log('Creating teams...');
  const teamRows = [];
  for (const tc of TEAM_CONFIG) {
    const [team] = await db
      .insert(schema.teams)
      .values({
        orgId: org.id,
        name: tc.name,
        slug: tc.slug,
        monthlyBudgetCents: tc.budgetCents,
      })
      .returning();
    teamRows.push(team);
  }

  // Team memberships
  await db.insert(schema.teamMemberships).values([
    { teamId: teamRows[0].id, userId: user1.id },
    { teamId: teamRows[0].id, userId: user2.id },
    { teamId: teamRows[1].id, userId: user2.id },
    { teamId: teamRows[2].id, userId: user1.id },
    { teamId: teamRows[3].id, userId: user1.id },
  ]);

  // 5. Provider connections
  console.log('Creating provider connections...');
  const connections: Array<{ id: string; provider: string }> = [];

  for (const [provider, displayName] of [
    ['openai', 'OpenAI Production'],
    ['anthropic', 'Anthropic Main'],
    ['aws_bedrock', 'AWS Bedrock US-East'],
  ] as const) {
    const fakeCreds = JSON.stringify({ apiKey: `fake-${provider}-key` });
    const { ciphertext, iv } = encrypt(fakeCreds, org.id);
    const [conn] = await db
      .insert(schema.providerConnections)
      .values({
        orgId: org.id,
        provider,
        displayName,
        credentialsEncrypted: ciphertext,
        credentialsIv: iv,
        status: 'active',
        lastSyncedAt: new Date(),
      })
      .returning();
    connections.push({ id: conn.id, provider });
  }

  // 6. Team provider mappings
  console.log('Creating team-provider mappings...');
  const openaiConn = connections.find((c) => c.provider === 'openai')!;
  const anthropicConn = connections.find((c) => c.provider === 'anthropic')!;
  const bedrockConn = connections.find((c) => c.provider === 'aws_bedrock')!;

  await db.insert(schema.teamProviderMappings).values([
    {
      teamId: teamRows[0].id,
      connectionId: openaiConn.id,
      providerEntityType: 'project',
      providerEntityId: 'proj_engineering',
      providerEntityName: 'Engineering',
    },
    {
      teamId: teamRows[1].id,
      connectionId: openaiConn.id,
      providerEntityType: 'project',
      providerEntityId: 'proj_marketing',
      providerEntityName: 'Marketing',
    },
    {
      teamId: teamRows[2].id,
      connectionId: anthropicConn.id,
      providerEntityType: 'workspace',
      providerEntityId: 'ws_datascience',
      providerEntityName: 'Data Science',
    },
    {
      teamId: teamRows[3].id,
      connectionId: bedrockConn.id,
      providerEntityType: 'cost_tag',
      providerEntityId: 'tag_product',
      providerEntityName: 'Product',
    },
  ]);

  // 7. Generate 90 days of usage and cost records
  console.log('Generating 90 days of usage & cost records...');
  const now = new Date();
  const DAYS = 90;

  let usageBatch: Array<Record<string, unknown>> = [];
  let costBatch: Array<Record<string, unknown>> = [];

  for (let d = 0; d < DAYS; d++) {
    const date = new Date(now.getTime() - (DAYS - d) * 86400000);
    const dateStr = date.toISOString().split('T')[0];
    const weekend = isWeekend(date);
    const dayMultiplier = weekend ? 0.3 : 1.0;
    const trendMultiplier = 0.7 + (d / DAYS) * 0.6;

    for (const conn of connections) {
      const provider = conn.provider as keyof typeof MODELS;
      const models = MODELS[provider];

      for (const model of models) {
        const teamIdx =
          provider === 'openai'
            ? Math.random() < 0.7
              ? 0
              : 1
            : provider === 'anthropic'
              ? Math.random() < 0.8
                ? 2
                : 0
              : 3;
        const team = teamRows[teamIdx];

        const baseInputTokens = Math.round(
          50000 * model.weight * dayMultiplier * trendMultiplier
        );
        const baseOutputTokens = Math.round(baseInputTokens * 0.35);
        const baseRequests = Math.round(baseInputTokens / 500);

        const inputTokens = randomVariance(baseInputTokens, 0.3);
        const outputTokens = randomVariance(baseOutputTokens, 0.3);
        const requests = randomVariance(baseRequests, 0.2);

        for (const hour of [9, 12, 15, 18]) {
          const bucketStart = new Date(date);
          bucketStart.setUTCHours(hour, 0, 0, 0);
          const bucketEnd = new Date(bucketStart.getTime() + 3600000);
          const hourShare = hour === 12 || hour === 15 ? 0.35 : 0.15;

          usageBatch.push({
            orgId: org.id,
            connectionId: conn.id,
            provider: conn.provider,
            source: 'provider',
            bucketStart,
            bucketEnd,
            bucketWidth: '1h',
            model: model.name,
            providerProjectId:
              provider === 'openai'
                ? teamIdx === 0
                  ? 'proj_engineering'
                  : 'proj_marketing'
                : undefined,
            providerWorkspaceId:
              provider === 'anthropic' ? 'ws_datascience' : undefined,
            inputTokens: Math.round(inputTokens * hourShare),
            outputTokens: Math.round(outputTokens * hourShare),
            cachedInputTokens: Math.round(inputTokens * hourShare * 0.1),
            totalRequests: Math.round(requests * hourShare),
            teamId: team.id,
          });
        }

        const costCents = Math.round(
          (inputTokens * model.inputPriceCents) / 1_000_000 +
            (outputTokens * model.outputPriceCents) / 1_000_000
        );

        costBatch.push({
          orgId: org.id,
          connectionId: conn.id,
          provider: conn.provider,
          source: 'provider',
          bucketDate: dateStr,
          model: model.name,
          providerProjectId:
            provider === 'openai'
              ? teamIdx === 0
                ? 'proj_engineering'
                : 'proj_marketing'
              : undefined,
          providerWorkspaceId:
            provider === 'anthropic' ? 'ws_datascience' : undefined,
          amountCents: costCents,
          currency: 'USD',
          teamId: team.id,
        });
      }
    }

    if (d % 10 === 9 || d === DAYS - 1) {
      if (usageBatch.length > 0) {
        await db.insert(schema.usageRecords).values(usageBatch as never);
        usageBatch = [];
      }
      if (costBatch.length > 0) {
        await db.insert(schema.costRecords).values(costBatch as never);
        costBatch = [];
      }
      console.log(`  ...day ${d + 1}/${DAYS} done`);
    }
  }

  // 8. Budget alerts
  console.log('Creating budget alerts...');
  await db.insert(schema.budgetAlerts).values([
    {
      orgId: org.id,
      teamId: teamRows[0].id,
      thresholdCents: 5000_00,
      period: 'monthly',
      notifyEmails: 'admin@acme.com',
      status: 'active',
    },
    {
      orgId: org.id,
      teamId: teamRows[2].id,
      thresholdCents: 3000_00,
      period: 'monthly',
      notifyEmails: 'admin@acme.com,member@acme.com',
      status: 'triggered',
      lastTriggeredAt: new Date(now.getTime() - 2 * 86400000),
    },
    {
      orgId: org.id,
      thresholdCents: 15000_00,
      period: 'monthly',
      notifyEmails: 'admin@acme.com',
      status: 'active',
    },
  ]);

  // 9. Sync jobs
  console.log('Creating sync job history...');
  for (const conn of connections) {
    for (let i = 0; i < 5; i++) {
      const startedAt = new Date(now.getTime() - i * 15 * 60 * 1000);
      await db.insert(schema.syncJobs).values({
        connectionId: conn.id,
        syncType: i % 2 === 0 ? 'usage' : 'cost',
        status: 'completed',
        startedAt,
        completedAt: new Date(
          startedAt.getTime() + 5000 + Math.random() * 10000
        ),
        recordsSynced: Math.floor(50 + Math.random() * 200),
      });
    }
  }

  console.log('\nSeed complete!');
  console.log(`  Organization: ${org.name} (${org.id})`);
  console.log(
    `  Users: admin@acme.com / member@acme.com (password: demo-password-123)`
  );
  console.log(`  Teams: ${teamRows.map((t) => t.name).join(', ')}`);
  console.log(`  Connections: ${connections.length}`);
  console.log(`  Days of data: ${DAYS}`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
