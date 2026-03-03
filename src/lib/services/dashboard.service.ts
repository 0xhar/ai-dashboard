import { db } from '@/lib/db';
import { costRecords } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, sum, desc, count, like } from 'drizzle-orm';
import type { DatePeriod, Granularity, GroupBy } from '@/lib/types';

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

export async function getSummary(orgId: string, period: DatePeriod) {
  const { start, end } = getPeriodDates(period);

  // Total spend
  const [totalResult] = await db
    .select({ total: sum(costRecords.amountCents) })
    .from(costRecords)
    .where(
      and(
        eq(costRecords.orgId, orgId),
        gte(costRecords.bucketDate, start),
        lte(costRecords.bucketDate, end)
      )
    );

  // Spend by provider
  const byProvider = await db
    .select({
      provider: costRecords.provider,
      total: sum(costRecords.amountCents),
    })
    .from(costRecords)
    .where(
      and(
        eq(costRecords.orgId, orgId),
        gte(costRecords.bucketDate, start),
        lte(costRecords.bucketDate, end)
      )
    )
    .groupBy(costRecords.provider);

  // Spend by model (top 10)
  const byModel = await db
    .select({
      model: costRecords.model,
      provider: costRecords.provider,
      total: sum(costRecords.amountCents),
    })
    .from(costRecords)
    .where(
      and(
        eq(costRecords.orgId, orgId),
        gte(costRecords.bucketDate, start),
        lte(costRecords.bucketDate, end)
      )
    )
    .groupBy(costRecords.model, costRecords.provider)
    .orderBy(desc(sum(costRecords.amountCents)))
    .limit(10);

  // Prior period for delta
  const periodDays =
    period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
  const priorStart = new Date(new Date(start).getTime() - periodDays * 86400000)
    .toISOString()
    .split('T')[0];

  const [priorResult] = await db
    .select({ total: sum(costRecords.amountCents) })
    .from(costRecords)
    .where(
      and(
        eq(costRecords.orgId, orgId),
        gte(costRecords.bucketDate, priorStart),
        lte(costRecords.bucketDate, start)
      )
    );

  const currentTotal = Number(totalResult?.total || 0);
  const priorTotal = Number(priorResult?.total || 0);
  const deltaPercent =
    priorTotal > 0 ? ((currentTotal - priorTotal) / priorTotal) * 100 : 0;

  return {
    totalSpendCents: currentTotal,
    deltaPercent: Math.round(deltaPercent * 10) / 10,
    byProvider: byProvider.map((r) => ({
      provider: r.provider,
      totalCents: Number(r.total || 0),
    })),
    byModel: byModel.map((r) => ({
      model: r.model,
      provider: r.provider,
      totalCents: Number(r.total || 0),
    })),
  };
}

export async function getTimeseries(
  orgId: string,
  period: DatePeriod,
  granularity: Granularity,
  groupBy: GroupBy
) {
  const { start, end } = getPeriodDates(period);

  const dateTrunc =
    granularity === 'weekly'
      ? sql`date_trunc('week', ${costRecords.bucketDate}::timestamp)`
      : granularity === 'monthly'
        ? sql`date_trunc('month', ${costRecords.bucketDate}::timestamp)`
        : sql`${costRecords.bucketDate}::timestamp`;

  const groupField =
    groupBy === 'provider'
      ? costRecords.provider
      : groupBy === 'team'
        ? costRecords.teamId
        : costRecords.model;

  const rows = await db
    .select({
      date: dateTrunc.as('date'),
      group: groupField,
      total: sum(costRecords.amountCents),
    })
    .from(costRecords)
    .where(
      and(
        eq(costRecords.orgId, orgId),
        gte(costRecords.bucketDate, start),
        lte(costRecords.bucketDate, end)
      )
    )
    .groupBy(dateTrunc, groupField)
    .orderBy(dateTrunc);

  // Pivot into series
  const seriesMap = new Map<
    string,
    Array<{ date: string; amountCents: number }>
  >();
  for (const row of rows) {
    const key = String(row.group || 'unknown');
    if (!seriesMap.has(key)) seriesMap.set(key, []);
    seriesMap.get(key)!.push({
      date: String(row.date),
      amountCents: Number(row.total || 0),
    });
  }

  return Array.from(seriesMap.entries()).map(([name, data]) => ({
    name,
    data,
  }));
}

export async function getTopModels(
  orgId: string,
  period: DatePeriod,
  limit = 10
) {
  const { start, end } = getPeriodDates(period);

  return db
    .select({
      model: costRecords.model,
      provider: costRecords.provider,
      totalCents: sum(costRecords.amountCents),
    })
    .from(costRecords)
    .where(
      and(
        eq(costRecords.orgId, orgId),
        gte(costRecords.bucketDate, start),
        lte(costRecords.bucketDate, end)
      )
    )
    .groupBy(costRecords.model, costRecords.provider)
    .orderBy(desc(sum(costRecords.amountCents)))
    .limit(limit);
}

export async function getConnectionRecords(
  orgId: string,
  connectionId: string,
  options: {
    model?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const { model, startDate, endDate, page = 1, pageSize = 20 } = options;

  const conditions = [
    eq(costRecords.orgId, orgId),
    eq(costRecords.connectionId, connectionId),
  ];

  if (model) {
    conditions.push(like(costRecords.model, `%${model}%`));
  }
  if (startDate) {
    conditions.push(gte(costRecords.bucketDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(costRecords.bucketDate, endDate));
  }

  const where = and(...conditions);

  const [countResult] = await db
    .select({ total: count() })
    .from(costRecords)
    .where(where);

  const rows = await db
    .select({
      id: costRecords.id,
      bucketDate: costRecords.bucketDate,
      model: costRecords.model,
      provider: costRecords.provider,
      amountCents: costRecords.amountCents,
      providerProjectId: costRecords.providerProjectId,
      providerWorkspaceId: costRecords.providerWorkspaceId,
    })
    .from(costRecords)
    .where(where)
    .orderBy(desc(costRecords.bucketDate), desc(costRecords.amountCents))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  // Get distinct models for filter dropdown
  const models = await db
    .select({ model: costRecords.model })
    .from(costRecords)
    .where(
      and(
        eq(costRecords.orgId, orgId),
        eq(costRecords.connectionId, connectionId)
      )
    )
    .groupBy(costRecords.model)
    .orderBy(costRecords.model);

  return {
    rows,
    total: countResult?.total || 0,
    page,
    pageSize,
    totalPages: Math.ceil((countResult?.total || 0) / pageSize),
    availableModels: models.map((m) => m.model),
  };
}
