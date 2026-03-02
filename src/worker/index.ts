import { createQueues } from './queues';
import { registerSchedules } from './scheduler';
import { createSyncUsageWorker } from './workers/sync-usage.worker';
import { createSyncCostWorker } from './workers/sync-cost.worker';
import { createTeamAttributeWorker } from './workers/team-attribute.worker';
import { createBudgetCheckWorker } from './workers/budget-check.worker';
import { logger } from '@/lib/logger';

async function main() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const connection = { url: redisUrl };

  logger.info('Starting worker process...');

  // Create queues and register schedules
  const { usageQueue, costQueue, budgetQueue, attributeQueue } =
    createQueues(connection);
  await registerSchedules(usageQueue, costQueue, budgetQueue);

  // Start workers
  const workers = [
    createSyncUsageWorker(connection),
    createSyncCostWorker(connection),
    createTeamAttributeWorker(connection),
    createBudgetCheckWorker(connection),
  ];

  logger.info(`Started ${workers.length} workers`);

  // Graceful shutdown
  async function shutdown() {
    logger.info('Shutting down workers...');
    await Promise.all(workers.map((w) => w.close()));
    await usageQueue.close();
    await costQueue.close();
    await budgetQueue.close();
    await attributeQueue.close();
    process.exit(0);
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.error({ err }, 'Worker process failed');
  process.exit(1);
});
