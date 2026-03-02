import { z } from 'zod';
import { getAuthSession } from '@/lib/auth/middleware';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import { getTimeseries } from '@/lib/services/dashboard.service';
import type { DatePeriod, Granularity, GroupBy } from '@/lib/types';

const querySchema = z.object({
  period: z.enum(['7d', '30d', '90d', 'mtd', 'last_month']).default('30d'),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  groupBy: z.enum(['provider', 'model', 'team']).default('provider'),
});

export const GET = withErrorHandler(async (req: Request) => {
  const session = await getAuthSession();
  const url = new URL(req.url);
  const params = querySchema.parse({
    period: url.searchParams.get('period') || '30d',
    granularity: url.searchParams.get('granularity') || 'daily',
    groupBy: url.searchParams.get('groupBy') || 'provider',
  });
  const data = await getTimeseries(
    session.orgId,
    params.period as DatePeriod,
    params.granularity as Granularity,
    params.groupBy as GroupBy
  );
  return successResponse(data);
});
