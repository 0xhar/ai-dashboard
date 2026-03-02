import { Worker, type Job, Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { db } from '@/lib/db';
import { providerConnections, costRecords, syncJobs } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { decrypt } from '@/lib/crypto/encryption';
import { getAdapter } from '@/lib/providers/registry';
import type { ProviderType } from '@/lib/types';
import { createLogger } from '@/lib/logger';
import { fanOutSyncJobs } from '../scheduler';

const log = createLogger({ service: 'worker' });

export function createSyncCostWorker(connection: ConnectionOptions) {
  return new Worker(
    'sync:cost',
    async (job: Job) => {
      if (job.data.type === 'fan-out') {
        const queue = new Queue('sync:cost', { connection });
        await fanOutSyncJobs(queue, 'cost');
        await queue.close();
        return;
      }

      const { connectionId } = job.data;
      log.info({ connectionId }, 'Starting cost sync');

      const [conn] = await db
        .select()
        .from(providerConnections)
        .where(eq(providerConnections.id, connectionId))
        .limit(1);

      if (!conn) return;

      const [syncJob] = await db
        .insert(syncJobs)
        .values({
          connectionId,
          syncType: 'cost',
          status: 'running',
          startedAt: new Date(),
        })
        .returning();

      try {
        const credentials = JSON.parse(
          decrypt(conn.credentialsEncrypted, conn.credentialsIv, conn.orgId)
        );

        const cursor = conn.syncCursor as Record<string, string> | null;
        const startTime = cursor?.lastCostSync
          ? new Date(cursor.lastCostSync)
          : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const endTime = new Date();

        const adapter = getAdapter(conn.provider as ProviderType);
        let recordCount = 0;

        for await (const batch of adapter.fetchCosts(credentials, {
          orgId: conn.orgId,
          connectionId,
          startTime,
          endTime,
        })) {
          for (const record of batch) {
            await db
              .insert(costRecords)
              .values({
                orgId: record.orgId,
                connectionId: record.connectionId,
                provider: record.provider,
                source: record.source,
                bucketDate: record.bucketDate,
                model: record.model,
                providerProjectId: record.providerProjectId,
                providerWorkspaceId: record.providerWorkspaceId,
                costCategory: record.costCategory,
                amountCents: record.amountCents,
                currency: record.currency,
              })
              .onConflictDoUpdate({
                target: [
                  costRecords.connectionId,
                  costRecords.bucketDate,
                  costRecords.model,
                  costRecords.providerProjectId,
                  costRecords.providerWorkspaceId,
                  costRecords.costCategory,
                ],
                set: {
                  amountCents: sql`excluded.amount_cents`,
                },
              });
            recordCount++;
          }
        }

        await db
          .update(providerConnections)
          .set({
            syncCursor: {
              ...((conn.syncCursor as object) || {}),
              lastCostSync: endTime.toISOString(),
            },
            lastSyncedAt: new Date(),
            status: 'active',
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(providerConnections.id, connectionId));

        await db
          .update(syncJobs)
          .set({
            status: 'completed',
            completedAt: new Date(),
            recordsSynced: recordCount,
          })
          .where(eq(syncJobs.id, syncJob.id));

        log.info({ connectionId, recordCount }, 'Cost sync completed');
      } catch (err) {
        log.error({ connectionId, err }, 'Cost sync failed');
        await db
          .update(syncJobs)
          .set({
            status: 'failed',
            completedAt: new Date(),
            errorMessage: String(err),
          })
          .where(eq(syncJobs.id, syncJob.id));
        throw err;
      }
    },
    { connection, concurrency: 3 }
  );
}
