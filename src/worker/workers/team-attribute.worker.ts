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
    'team-attribute',
    async (job: Job) => {
      const { connectionId, teamId, orgId } = job.data;

      log.info({ connectionId, teamId, orgId }, 'Starting team attribution');

      // When re-attributing for a specific team (after mapping change),
      // first clear existing team_id for this team so we re-apply from scratch
      if (teamId && !connectionId) {
        await db
          .update(usageRecords)
          .set({ teamId: null })
          .where(eq(usageRecords.teamId, teamId));

        await db
          .update(costRecords)
          .set({ teamId: null })
          .where(eq(costRecords.teamId, teamId));
      }

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

      for (const mapping of mappings) {
        // Build WHERE condition based on entity type for usage records
        const usageConditions = [];
        if (mapping.providerEntityType === 'project') {
          usageConditions.push(
            eq(usageRecords.providerProjectId, mapping.providerEntityId)
          );
        } else if (mapping.providerEntityType === 'workspace') {
          usageConditions.push(
            eq(usageRecords.providerWorkspaceId, mapping.providerEntityId)
          );
        } else if (mapping.providerEntityType === 'api_key') {
          usageConditions.push(
            eq(usageRecords.providerApiKeyId, mapping.providerEntityId)
          );
        }

        if (usageConditions.length > 0) {
          await db
            .update(usageRecords)
            .set({ teamId: mapping.teamId })
            .where(
              and(
                eq(usageRecords.connectionId, mapping.connectionId),
                isNull(usageRecords.teamId),
                ...usageConditions
              )
            );
        }

        // Build WHERE condition for cost records
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

      log.info(
        { mappingsProcessed: mappings.length },
        'Team attribution completed'
      );
    },
    { connection, concurrency: 2 }
  );
}
