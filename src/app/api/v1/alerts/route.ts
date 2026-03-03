import { z } from 'zod';
import { getAuthSession } from '@/lib/auth/middleware';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import { ValidationError, PlanLimitError } from '@/lib/api/errors';
import * as alertsService from '@/lib/services/alerts.service';
import { checkLimit } from '@/lib/features/gates';
import type { PlanTier } from '@/lib/types';

const createSchema = z.object({
  teamId: z.string().uuid().optional(),
  thresholdCents: z.number().int().min(1),
  period: z.enum(['daily', 'weekly', 'monthly']),
  notifyEmails: z.string().min(1),
});

export const GET = withErrorHandler(async () => {
  const session = await getAuthSession();
  const alerts = await alertsService.listAlerts(session.orgId);
  return successResponse(alerts);
});

export const POST = withErrorHandler(async (req: Request) => {
  const session = await getAuthSession();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  // Check plan limits
  const currentCount = await alertsService.countAlerts(session.orgId);
  if (!checkLimit(session.plan as PlanTier, 'maxAlerts', currentCount)) {
    throw new PlanLimitError(
      'Alert limit reached. Upgrade to create more alerts.'
    );
  }

  const alert = await alertsService.createAlert(session.orgId, parsed.data);
  return successResponse(alert, 201);
});
