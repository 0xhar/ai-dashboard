import { getAuthSession } from '@/lib/auth/middleware';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import { getConnectionRecords } from '@/lib/services/dashboard.service';

export const GET = withErrorHandler(async (req: Request, context: unknown) => {
  const session = await getAuthSession();
  const { connectionId } = await (
    context as { params: Promise<{ connectionId: string }> }
  ).params;

  const url = new URL(req.url);
  const model = url.searchParams.get('model') || undefined;
  const startDate = url.searchParams.get('startDate') || undefined;
  const endDate = url.searchParams.get('endDate') || undefined;
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);

  const result = await getConnectionRecords(session.orgId, connectionId, {
    model,
    startDate,
    endDate,
    page: Math.max(1, page),
    pageSize: Math.min(100, Math.max(1, pageSize)),
  });

  return successResponse(result);
});
