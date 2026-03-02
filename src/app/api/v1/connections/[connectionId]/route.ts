import { getAuthSession } from '@/lib/auth/middleware';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import * as connectionsService from '@/lib/services/connections.service';

export const GET = withErrorHandler(async (_req: Request, context: unknown) => {
  const session = await getAuthSession();
  const { connectionId } = (
    context as { params: Promise<{ connectionId: string }> }
  ).params
    ? await (context as { params: Promise<{ connectionId: string }> }).params
    : { connectionId: '' };
  const connection = await connectionsService.getConnection(
    session.orgId,
    connectionId
  );
  return successResponse(connection);
});

export const DELETE = withErrorHandler(
  async (_req: Request, context: unknown) => {
    const session = await getAuthSession();
    const { connectionId } = await (
      context as { params: Promise<{ connectionId: string }> }
    ).params;
    await connectionsService.deleteConnection(session.orgId, connectionId);
    return successResponse({ deleted: true });
  }
);
