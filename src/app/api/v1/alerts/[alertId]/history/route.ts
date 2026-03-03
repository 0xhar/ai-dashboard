import { getAuthSession } from '@/lib/auth/middleware';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import * as alertsService from '@/lib/services/alerts.service';

export const GET = withErrorHandler(async (_req: Request, context: unknown) => {
  const session = await getAuthSession();
  const { alertId } = await (
    context as { params: Promise<{ alertId: string }> }
  ).params;

  // Verify alert belongs to org
  const alert = await alertsService.getAlert(session.orgId, alertId);

  // For now, return the alert's trigger info as history
  // A dedicated alert_history table would be needed for full history
  const history = alert.lastTriggeredAt
    ? [
        {
          triggeredAt: alert.lastTriggeredAt,
          thresholdCents: alert.thresholdCents,
          spendCents: alert.currentSpendCents,
        },
      ]
    : [];

  return successResponse(history);
});
