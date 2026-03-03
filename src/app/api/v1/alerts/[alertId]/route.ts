import { z } from 'zod';
import { getAuthSession } from '@/lib/auth/middleware';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import { ValidationError } from '@/lib/api/errors';
import * as alertsService from '@/lib/services/alerts.service';

const updateSchema = z.object({
  thresholdCents: z.number().int().min(1).optional(),
  period: z.enum(['daily', 'weekly', 'monthly']).optional(),
  notifyEmails: z.string().min(1).optional(),
  status: z.enum(['active', 'triggered', 'resolved', 'disabled']).optional(),
});

async function getAlertId(context: unknown): Promise<string> {
  const { alertId } = await (
    context as { params: Promise<{ alertId: string }> }
  ).params;
  return alertId;
}

export const GET = withErrorHandler(async (_req: Request, context: unknown) => {
  const session = await getAuthSession();
  const alertId = await getAlertId(context);
  const alert = await alertsService.getAlert(session.orgId, alertId);
  return successResponse(alert);
});

export const PATCH = withErrorHandler(
  async (req: Request, context: unknown) => {
    const session = await getAuthSession();
    const alertId = await getAlertId(context);
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const alert = await alertsService.updateAlert(
      session.orgId,
      alertId,
      parsed.data
    );
    return successResponse(alert);
  }
);

export const DELETE = withErrorHandler(
  async (_req: Request, context: unknown) => {
    const session = await getAuthSession();
    const alertId = await getAlertId(context);
    await alertsService.deleteAlert(session.orgId, alertId);
    return successResponse({ deleted: true });
  }
);
