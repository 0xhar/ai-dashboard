import { z } from 'zod';
import { getAuthSession } from '@/lib/auth/middleware';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import { getSummary } from '@/lib/services/dashboard.service';
import type { DatePeriod } from '@/lib/types';

const querySchema = z.object({
  period: z.enum(['7d', '30d', '90d', 'mtd', 'last_month']).default('30d'),
});

export const GET = withErrorHandler(async (req: Request) => {
  const session = await getAuthSession();
  const url = new URL(req.url);
  const params = querySchema.parse({
    period: url.searchParams.get('period') || '30d',
  });
  const data = await getSummary(session.orgId, params.period as DatePeriod);
  return successResponse(data);
});
