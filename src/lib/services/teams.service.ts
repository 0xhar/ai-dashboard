import { db } from '@/lib/db';
import {
  teams,
  teamMemberships,
  teamProviderMappings,
  costRecords,
  users,
} from '@/lib/db/schema';
import { eq, and, sql, sum, desc, gte, lte, count } from 'drizzle-orm';
import { NotFoundError, ValidationError } from '@/lib/api/errors';
import type { DatePeriod } from '@/lib/types';

function getPeriodDates(period: DatePeriod): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];

  switch (period) {
    case '7d':
      return {
        start: new Date(now.getTime() - 7 * 86400000)
          .toISOString()
          .split('T')[0],
        end,
      };
    case '30d':
      return {
        start: new Date(now.getTime() - 30 * 86400000)
          .toISOString()
          .split('T')[0],
        end,
      };
    case '90d':
      return {
        start: new Date(now.getTime() - 90 * 86400000)
          .toISOString()
          .split('T')[0],
        end,
      };
    case 'mtd':
      return {
        start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
        end,
      };
    case 'last_month': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLast = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: lastMonth.toISOString().split('T')[0],
        end: endOfLast.toISOString().split('T')[0],
      };
    }
  }
}

export async function createTeam(
  orgId: string,
  name: string,
  slug: string,
  monthlyBudgetCents?: number
) {
  // Validate unique slug within org
  const existing = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.orgId, orgId), eq(teams.slug, slug)))
    .limit(1);

  if (existing.length > 0) {
    throw new ValidationError('A team with this slug already exists');
  }

  const [team] = await db
    .insert(teams)
    .values({
      orgId,
      name,
      slug,
      monthlyBudgetCents: monthlyBudgetCents ?? null,
    })
    .returning();

  return team;
}

export async function listTeams(orgId: string) {
  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      monthlyBudgetCents: teams.monthlyBudgetCents,
      createdAt: teams.createdAt,
      memberCount: count(teamMemberships.id),
    })
    .from(teams)
    .leftJoin(teamMemberships, eq(teams.id, teamMemberships.teamId))
    .where(eq(teams.orgId, orgId))
    .groupBy(teams.id)
    .orderBy(teams.name);

  return rows;
}

export async function getTeam(orgId: string, teamId: string) {
  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.orgId, orgId)))
    .limit(1);

  if (!team) throw new NotFoundError('Team not found');

  const members = await db
    .select({
      id: teamMemberships.id,
      userId: teamMemberships.userId,
      userName: users.name,
      userEmail: users.email,
      joinedAt: teamMemberships.createdAt,
    })
    .from(teamMemberships)
    .innerJoin(users, eq(teamMemberships.userId, users.id))
    .where(eq(teamMemberships.teamId, teamId));

  const mappings = await db
    .select()
    .from(teamProviderMappings)
    .where(eq(teamProviderMappings.teamId, teamId));

  return { ...team, members, mappings };
}

export async function updateTeam(
  orgId: string,
  teamId: string,
  updates: { name?: string; slug?: string; monthlyBudgetCents?: number | null }
) {
  // Verify team exists and belongs to org
  const [existing] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.orgId, orgId)))
    .limit(1);

  if (!existing) throw new NotFoundError('Team not found');

  // If slug changing, validate unique
  if (updates.slug) {
    const dupes = await db
      .select({ id: teams.id })
      .from(teams)
      .where(
        and(
          eq(teams.orgId, orgId),
          eq(teams.slug, updates.slug),
          sql`${teams.id} != ${teamId}`
        )
      )
      .limit(1);

    if (dupes.length > 0) {
      throw new ValidationError('A team with this slug already exists');
    }
  }

  const [updated] = await db
    .update(teams)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(teams.id, teamId))
    .returning();

  return updated;
}

export async function deleteTeam(orgId: string, teamId: string) {
  const result = await db
    .delete(teams)
    .where(and(eq(teams.id, teamId), eq(teams.orgId, orgId)))
    .returning();

  if (result.length === 0) throw new NotFoundError('Team not found');
  return result[0];
}

export async function addTeamMember(teamId: string, userId: string) {
  const [membership] = await db
    .insert(teamMemberships)
    .values({ teamId, userId })
    .onConflictDoNothing()
    .returning();

  return membership;
}

export async function removeTeamMember(teamId: string, userId: string) {
  const result = await db
    .delete(teamMemberships)
    .where(
      and(
        eq(teamMemberships.teamId, teamId),
        eq(teamMemberships.userId, userId)
      )
    )
    .returning();

  if (result.length === 0) throw new NotFoundError('Team membership not found');
  return result[0];
}

export async function listTeamMappings(teamId: string) {
  return db
    .select()
    .from(teamProviderMappings)
    .where(eq(teamProviderMappings.teamId, teamId));
}

export async function createTeamMapping(
  teamId: string,
  connectionId: string,
  providerEntityType: string,
  providerEntityId: string,
  providerEntityName?: string
) {
  const [mapping] = await db
    .insert(teamProviderMappings)
    .values({
      teamId,
      connectionId,
      providerEntityType,
      providerEntityId,
      providerEntityName: providerEntityName ?? null,
    })
    .onConflictDoNothing()
    .returning();

  return mapping;
}

export async function deleteTeamMapping(teamId: string, mappingId: string) {
  const result = await db
    .delete(teamProviderMappings)
    .where(
      and(
        eq(teamProviderMappings.id, mappingId),
        eq(teamProviderMappings.teamId, teamId)
      )
    )
    .returning();

  if (result.length === 0) throw new NotFoundError('Mapping not found');
  return result[0];
}

export async function getTeamAnalytics(teamId: string, period: DatePeriod) {
  const { start, end } = getPeriodDates(period);

  // Total spend
  const [totalResult] = await db
    .select({ total: sum(costRecords.amountCents) })
    .from(costRecords)
    .where(
      and(
        eq(costRecords.teamId, teamId),
        gte(costRecords.bucketDate, start),
        lte(costRecords.bucketDate, end)
      )
    );

  // Budget info
  const [team] = await db
    .select({
      monthlyBudgetCents: teams.monthlyBudgetCents,
    })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  // Spend by model
  const byModel = await db
    .select({
      model: costRecords.model,
      provider: costRecords.provider,
      total: sum(costRecords.amountCents),
    })
    .from(costRecords)
    .where(
      and(
        eq(costRecords.teamId, teamId),
        gte(costRecords.bucketDate, start),
        lte(costRecords.bucketDate, end)
      )
    )
    .groupBy(costRecords.model, costRecords.provider)
    .orderBy(desc(sum(costRecords.amountCents)))
    .limit(10);

  // Time-series (daily)
  const timeseries = await db
    .select({
      date: costRecords.bucketDate,
      total: sum(costRecords.amountCents),
    })
    .from(costRecords)
    .where(
      and(
        eq(costRecords.teamId, teamId),
        gte(costRecords.bucketDate, start),
        lte(costRecords.bucketDate, end)
      )
    )
    .groupBy(costRecords.bucketDate)
    .orderBy(costRecords.bucketDate);

  const totalSpendCents = Number(totalResult?.total || 0);
  const budgetCents = team?.monthlyBudgetCents || null;
  const budgetUtilization =
    budgetCents && budgetCents > 0
      ? Math.round((totalSpendCents / budgetCents) * 1000) / 10
      : null;

  return {
    totalSpendCents,
    budgetCents,
    budgetUtilization,
    byModel: byModel.map((r) => ({
      model: r.model,
      provider: r.provider,
      totalCents: Number(r.total || 0),
    })),
    timeseries: timeseries.map((r) => ({
      date: r.date,
      amountCents: Number(r.total || 0),
    })),
  };
}

export async function countTeams(orgId: string): Promise<number> {
  const [result] = await db
    .select({ total: count() })
    .from(teams)
    .where(eq(teams.orgId, orgId));
  return result?.total || 0;
}
