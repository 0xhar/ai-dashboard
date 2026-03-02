import {
  pgTable,
  uuid,
  varchar,
  bigint,
  integer,
  timestamp,
  index,
  unique,
  bigserial,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { providerConnections } from './provider-connections';
import { teams } from './teams';

export const usageRecords = pgTable(
  'usage_records',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => providerConnections.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 20 }).notNull(),
    source: varchar('source', { length: 20 }).notNull().default('provider'),
    bucketStart: timestamp('bucket_start', { withTimezone: true }).notNull(),
    bucketEnd: timestamp('bucket_end', { withTimezone: true }).notNull(),
    bucketWidth: varchar('bucket_width', { length: 5 }).notNull(),
    model: varchar('model', { length: 255 }).notNull(),
    providerProjectId: varchar('provider_project_id', { length: 255 }),
    providerWorkspaceId: varchar('provider_workspace_id', { length: 255 }),
    providerUserId: varchar('provider_user_id', { length: 255 }),
    providerApiKeyId: varchar('provider_api_key_id', { length: 255 }),
    serviceTier: varchar('service_tier', { length: 50 }),
    inputTokens: bigint('input_tokens', { mode: 'number' })
      .notNull()
      .default(0),
    outputTokens: bigint('output_tokens', { mode: 'number' })
      .notNull()
      .default(0),
    cachedInputTokens: bigint('cached_input_tokens', { mode: 'number' })
      .notNull()
      .default(0),
    totalRequests: integer('total_requests').notNull().default(0),
    teamId: uuid('team_id').references(() => teams.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('usage_org_bucket_idx').on(t.orgId, t.bucketStart),
    index('usage_team_bucket_idx').on(t.teamId, t.bucketStart),
    index('usage_bucket_start_idx').on(t.bucketStart),
    unique('usage_upsert_key').on(
      t.connectionId,
      t.bucketStart,
      t.bucketWidth,
      t.model,
      t.providerProjectId,
      t.providerWorkspaceId,
      t.providerApiKeyId
    ),
  ]
);
