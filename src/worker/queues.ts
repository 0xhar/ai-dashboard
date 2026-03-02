import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';

export function createQueues(connection: ConnectionOptions) {
  const usageQueue = new Queue('sync-usage', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: { age: 7 * 24 * 3600 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  });

  const costQueue = new Queue('sync-cost', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60_000 },
      removeOnComplete: { age: 7 * 24 * 3600 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  });

  const budgetQueue = new Queue('budget-check', {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 30_000 },
    },
  });

  const attributeQueue = new Queue('team-attribute', {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10_000 },
    },
  });

  return { usageQueue, costQueue, budgetQueue, attributeQueue };
}
