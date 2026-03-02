import type { Queue } from 'bullmq';
import { db } from '@/lib/db';
import { providerConnections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function registerSchedules(
  usageQueue: Queue,
  costQueue: Queue,
  budgetQueue: Queue
) {
  // Usage sync: every 15 minutes
  await usageQueue.upsertJobScheduler(
    'usage-scheduler',
    { every: 15 * 60 * 1000 },
    {
      name: 'fan-out-usage',
      data: { type: 'fan-out' },
    }
  );

  // Cost sync: every 6 hours
  await costQueue.upsertJobScheduler(
    'cost-scheduler',
    { every: 6 * 60 * 60 * 1000 },
    {
      name: 'fan-out-cost',
      data: { type: 'fan-out' },
    }
  );

  // Budget check: every hour
  await budgetQueue.upsertJobScheduler(
    'budget-scheduler',
    { every: 60 * 60 * 1000 },
    {
      name: 'check-budgets',
      data: {},
    }
  );

  logger.info('Registered all job schedules');
}

export async function fanOutSyncJobs(queue: Queue, syncType: string) {
  const connections = await db
    .select({ id: providerConnections.id })
    .from(providerConnections)
    .where(eq(providerConnections.status, 'active'));

  for (const conn of connections) {
    await queue.add(`sync-${syncType}`, { connectionId: conn.id });
  }

  logger.info(
    { syncType, connectionCount: connections.length },
    'Fanned out sync jobs'
  );
}
