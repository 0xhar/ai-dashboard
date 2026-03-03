import { db } from '@/lib/db';
import { budgetAlerts, costRecords, teams } from '@/lib/db/schema';
import { eq, and, gte, sum, count, desc } from 'drizzle-orm';
import { NotFoundError } from '@/lib/api/errors';

function getPeriodStart(period: string): string {
  const now = new Date();
  switch (period) {
    case 'daily':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())
        .toISOString()
        .split('T')[0];
    case 'weekly': {
      const dayOfWeek = now.getDay();
      const start = new Date(now);
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      return start.toISOString().split('T')[0];
    }
    case 'monthly':
    default:
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }
}

export async function createAlert(
  orgId: string,
  data: {
    teamId?: string;
    thresholdCents: number;
    period: string;
    notifyEmails: string;
  }
) {
  const [alert] = await db
    .insert(budgetAlerts)
    .values({
      orgId,
      teamId: data.teamId || null,
      thresholdCents: data.thresholdCents,
      period: data.period,
      notifyEmails: data.notifyEmails,
      status: 'active',
    })
    .returning();

  return alert;
}

export async function listAlerts(orgId: string) {
  const alerts = await db
    .select({
      id: budgetAlerts.id,
      orgId: budgetAlerts.orgId,
      teamId: budgetAlerts.teamId,
      teamName: teams.name,
      thresholdCents: budgetAlerts.thresholdCents,
      period: budgetAlerts.period,
      notifyEmails: budgetAlerts.notifyEmails,
      status: budgetAlerts.status,
      lastTriggeredAt: budgetAlerts.lastTriggeredAt,
      createdAt: budgetAlerts.createdAt,
    })
    .from(budgetAlerts)
    .leftJoin(teams, eq(budgetAlerts.teamId, teams.id))
    .where(eq(budgetAlerts.orgId, orgId))
    .orderBy(desc(budgetAlerts.createdAt));

  // Calculate current spend for each alert
  const alertsWithSpend = await Promise.all(
    alerts.map(async (alert) => {
      const periodStart = getPeriodStart(alert.period);
      const conditions = [
        eq(costRecords.orgId, alert.orgId),
        gte(costRecords.bucketDate, periodStart),
      ];
      if (alert.teamId) {
        conditions.push(eq(costRecords.teamId, alert.teamId));
      }

      const [result] = await db
        .select({ total: sum(costRecords.amountCents) })
        .from(costRecords)
        .where(and(...conditions));

      return {
        ...alert,
        currentSpendCents: Number(result?.total || 0),
      };
    })
  );

  return alertsWithSpend;
}

export async function getAlert(orgId: string, alertId: string) {
  const [alert] = await db
    .select({
      id: budgetAlerts.id,
      orgId: budgetAlerts.orgId,
      teamId: budgetAlerts.teamId,
      teamName: teams.name,
      thresholdCents: budgetAlerts.thresholdCents,
      period: budgetAlerts.period,
      notifyEmails: budgetAlerts.notifyEmails,
      status: budgetAlerts.status,
      lastTriggeredAt: budgetAlerts.lastTriggeredAt,
      createdAt: budgetAlerts.createdAt,
      updatedAt: budgetAlerts.updatedAt,
    })
    .from(budgetAlerts)
    .leftJoin(teams, eq(budgetAlerts.teamId, teams.id))
    .where(and(eq(budgetAlerts.id, alertId), eq(budgetAlerts.orgId, orgId)))
    .limit(1);

  if (!alert) throw new NotFoundError('Alert not found');

  // Current spend
  const periodStart = getPeriodStart(alert.period);
  const conditions = [
    eq(costRecords.orgId, alert.orgId),
    gte(costRecords.bucketDate, periodStart),
  ];
  if (alert.teamId) {
    conditions.push(eq(costRecords.teamId, alert.teamId));
  }

  const [result] = await db
    .select({ total: sum(costRecords.amountCents) })
    .from(costRecords)
    .where(and(...conditions));

  return {
    ...alert,
    currentSpendCents: Number(result?.total || 0),
  };
}

export async function updateAlert(
  orgId: string,
  alertId: string,
  updates: {
    thresholdCents?: number;
    period?: string;
    notifyEmails?: string;
    status?: string;
  }
) {
  const [existing] = await db
    .select({ id: budgetAlerts.id })
    .from(budgetAlerts)
    .where(and(eq(budgetAlerts.id, alertId), eq(budgetAlerts.orgId, orgId)))
    .limit(1);

  if (!existing) throw new NotFoundError('Alert not found');

  const [updated] = await db
    .update(budgetAlerts)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(budgetAlerts.id, alertId))
    .returning();

  return updated;
}

export async function deleteAlert(orgId: string, alertId: string) {
  const result = await db
    .delete(budgetAlerts)
    .where(and(eq(budgetAlerts.id, alertId), eq(budgetAlerts.orgId, orgId)))
    .returning();

  if (result.length === 0) throw new NotFoundError('Alert not found');
  return result[0];
}

export async function countAlerts(orgId: string): Promise<number> {
  const [result] = await db
    .select({ total: count() })
    .from(budgetAlerts)
    .where(eq(budgetAlerts.orgId, orgId));
  return result?.total || 0;
}
