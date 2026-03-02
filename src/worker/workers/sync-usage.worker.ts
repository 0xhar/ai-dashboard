import { Worker, type Job } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { db } from '@/lib/db';
import { providerConnections, usageRecords, syncJobs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '@/lib/crypto/encryption';
import { getAdapter } from '@/lib/providers/registry';
import type { ProviderType } from '@/lib/types';
import { createLogger } from '@/lib/logger';
import { fanOutSyncJobs } from '../scheduler';
import { Queue } from 'bullmq';
import { sql } from 'drizzle-orm';

const log = createLogger({ service: 'worker' });

export function createSyncUsageWorker(connection: ConnectionOptions) {
  return new Worker(
    'sync:usage',
    async (job: Job) => {
      // Fan-out job
      if (job.data.type === 'fan-out') {
        const queue = new Queue('sync:usage', { connection });
        await fanOutSyncJobs(queue, 'usage');
        await queue.close();
        return;
      }

      const { connectionId } = job.data;
      log.info({ connectionId }, 'Starting usage sync');

      // Load connection
      const [conn] = await db
        .select()
        .from(providerConnections)
        .where(eq(providerConnections.id, connectionId))
        .limit(1);

      if (!conn) {
        log.warn({ connectionId }, 'Connection not found, skipping');
        return;
      }

      // Create sync job record
      const [syncJob] = await db
        .insert(syncJobs)
        .values({
          connectionId,
          syncType: 'usage',
          status: 'running',
          startedAt: new Date(),
        })
        .returning();

      try {
        // Decrypt credentials
        const credentials = JSON.parse(
          decrypt(conn.credentialsEncrypted, conn.credentialsIv, conn.orgId)
        );

        // Determine time window
        const cursor = conn.syncCursor as Record<string, string> | null;
        const startTime = cursor?.lastUsageSync
          ? new Date(cursor.lastUsageSync)
          : new Date(Date.now() - 24 * 60 * 60 * 1000);
        const endTime = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago

        const adapter = getAdapter(conn.provider as ProviderType);
        let recordCount = 0;

        for await (const batch of adapter.fetchUsage(credentials, {
          orgId: conn.orgId,
          connectionId,
          startTime,
          endTime,
        })) {
          // Upsert records
          for (const record of batch) {
            await db
              .insert(usageRecords)
              .values({
                orgId: record.orgId,
                connectionId: record.connectionId,
                provider: record.provider,
                source: record.source,
                bucketStart: record.bucketStart,
                bucketEnd: record.bucketEnd,
                bucketWidth: record.bucketWidth,
                model: record.model,
                providerProjectId: record.providerProjectId,
                providerWorkspaceId: record.providerWorkspaceId,
                providerUserId: record.providerUserId,
                providerApiKeyId: record.providerApiKeyId,
                serviceTier: record.serviceTier,
                inputTokens: record.inputTokens,
                outputTokens: record.outputTokens,
                cachedInputTokens: record.cachedInputTokens,
                totalRequests: record.totalRequests,
              })
              .onConflictDoUpdate({
                target: [
                  usageRecords.connectionId,
                  usageRecords.bucketStart,
                  usageRecords.bucketWidth,
                  usageRecords.model,
                  usageRecords.providerProjectId,
                  usageRecords.providerWorkspaceId,
                  usageRecords.providerApiKeyId,
                ],
                set: {
                  inputTokens: sql`excluded.input_tokens`,
                  outputTokens: sql`excluded.output_tokens`,
                  cachedInputTokens: sql`excluded.cached_input_tokens`,
                  totalRequests: sql`excluded.total_requests`,
                },
              });
            recordCount++;
          }
        }

        // Update sync cursor
        await db
          .update(providerConnections)
          .set({
            syncCursor: {
              ...((conn.syncCursor as object) || {}),
              lastUsageSync: endTime.toISOString(),
            },
            lastSyncedAt: new Date(),
            status: 'active',
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(providerConnections.id, connectionId));

        // Update sync job
        await db
          .update(syncJobs)
          .set({
            status: 'completed',
            completedAt: new Date(),
            recordsSynced: recordCount,
          })
          .where(eq(syncJobs.id, syncJob.id));

        // Enqueue team attribution
        const attrQueue = new Queue('team:attribute', { connection });
        await attrQueue.add('attribute', { connectionId });
        await attrQueue.close();

        log.info({ connectionId, recordCount }, 'Usage sync completed');
      } catch (err) {
        log.error({ connectionId, err }, 'Usage sync failed');

        await db
          .update(syncJobs)
          .set({
            status: 'failed',
            completedAt: new Date(),
            errorMessage: String(err),
          })
          .where(eq(syncJobs.id, syncJob.id));

        await db
          .update(providerConnections)
          .set({
            status: 'error',
            lastError: String(err),
            updatedAt: new Date(),
          })
          .where(eq(providerConnections.id, connectionId));

        throw err;
      }
    },
    { connection, concurrency: 3 }
  );
}
