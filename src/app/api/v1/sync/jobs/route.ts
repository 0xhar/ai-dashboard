import { getAuthSession } from '@/lib/auth/middleware';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { syncJobs, providerConnections } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const GET = withErrorHandler(async (req: Request) => {
  const session = await getAuthSession();
  const url = new URL(req.url);
  const connectionId = url.searchParams.get('connectionId');

  if (!connectionId) {
    // Return all sync jobs for the org's connections
    const jobs = await db
      .select({
        id: syncJobs.id,
        connectionId: syncJobs.connectionId,
        syncType: syncJobs.syncType,
        status: syncJobs.status,
        startedAt: syncJobs.startedAt,
        completedAt: syncJobs.completedAt,
        recordsSynced: syncJobs.recordsSynced,
        errorMessage: syncJobs.errorMessage,
        createdAt: syncJobs.createdAt,
      })
      .from(syncJobs)
      .innerJoin(
        providerConnections,
        eq(syncJobs.connectionId, providerConnections.id)
      )
      .where(eq(providerConnections.orgId, session.orgId))
      .orderBy(desc(syncJobs.createdAt))
      .limit(100);

    return successResponse(jobs);
  }

  // Verify connection belongs to org
  const [connection] = await db
    .select({ id: providerConnections.id })
    .from(providerConnections)
    .where(
      and(
        eq(providerConnections.id, connectionId),
        eq(providerConnections.orgId, session.orgId)
      )
    )
    .limit(1);

  if (!connection) {
    return successResponse([]);
  }

  const jobs = await db
    .select()
    .from(syncJobs)
    .where(eq(syncJobs.connectionId, connectionId))
    .orderBy(desc(syncJobs.createdAt))
    .limit(50);

  return successResponse(jobs);
});
