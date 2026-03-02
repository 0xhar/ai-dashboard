import { Worker, type Job } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { db } from '@/lib/db';
import {
  teamProviderMappings,
  usageRecords,
  costRecords,
} from '@/lib/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger({ service: 'worker' });

export function createTeamAttributeWorker(connection: ConnectionOptions) {
  return new Worker(
    'team:attribute',
    async (job: Job) => {
      const { connectionId, teamId, orgId } = job.data;

      log.info({ connectionId, teamId, orgId }, 'Starting team attribution');

      // Get all mappings for the relevant scope
      const mappings = await db
        .select()
        .from(teamProviderMappings)
        .where(
          connectionId
            ? eq(teamProviderMappings.connectionId, connectionId)
            : teamId
              ? eq(teamProviderMappings.teamId, teamId)
              : sql`1=1`
        );

      let attributed = 0;

      for (const mapping of mappings) {
        // Build WHERE condition based on entity type
        const entityConditions = [];
        if (mapping.providerEntityType === 'project') {
          entityConditions.push(
            eq(usageRecords.providerProjectId, mapping.providerEntityId)
          );
        } else if (mapping.providerEntityType === 'workspace') {
          entityConditions.push(
            eq(usageRecords.providerWorkspaceId, mapping.providerEntityId)
          );
        } else if (mapping.providerEntityType === 'api_key') {
          entityConditions.push(
            eq(usageRecords.providerApiKeyId, mapping.providerEntityId)
          );
        }

        if (entityConditions.length > 0) {
          // Update usage records
          await db
            .update(usageRecords)
            .set({ teamId: mapping.teamId })
            .where(
              and(
                eq(usageRecords.connectionId, mapping.connectionId),
                isNull(usageRecords.teamId),
                ...entityConditions
              )
            );

          // Update cost records
          const costConditions = [];
          if (mapping.providerEntityType === 'project') {
            costConditions.push(
              eq(costRecords.providerProjectId, mapping.providerEntityId)
            );
          } else if (mapping.providerEntityType === 'workspace') {
            costConditions.push(
              eq(costRecords.providerWorkspaceId, mapping.providerEntityId)
            );
          }

          if (costConditions.length > 0) {
            await db
              .update(costRecords)
              .set({ teamId: mapping.teamId })
              .where(
                and(
                  eq(costRecords.connectionId, mapping.connectionId),
                  isNull(costRecords.teamId),
                  ...costConditions
                )
              );
          }
        }

        attributed++;
      }

      log.info({ mappingsProcessed: attributed }, 'Team attribution completed');
    },
    { connection, concurrency: 2 }
  );
}
