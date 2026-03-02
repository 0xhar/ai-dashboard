import { getAuthSession } from '@/lib/auth/middleware';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import * as connectionsService from '@/lib/services/connections.service';
import { Queue } from 'bullmq';

export const POST = withErrorHandler(
  async (_req: Request, context: unknown) => {
    const session = await getAuthSession();
    const { connectionId } = await (
      context as { params: Promise<{ connectionId: string }> }
    ).params;

    // Verify connection exists and belongs to org
    await connectionsService.getConnection(session.orgId, connectionId);

    // Enqueue sync jobs using URL string (avoids ioredis version mismatch)
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const usageQueue = new Queue('sync:usage', {
      connection: { url: redisUrl },
    });
    const costQueue = new Queue('sync:cost', { connection: { url: redisUrl } });

    await usageQueue.add('sync-usage', { connectionId });
    await costQueue.add('sync-cost', { connectionId });

    await usageQueue.close();
    await costQueue.close();

    return successResponse({ queued: true });
  }
);
