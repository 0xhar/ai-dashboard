import { z } from 'zod';
import { getAuthSession } from '@/lib/auth/middleware';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import { getTopModels } from '@/lib/services/dashboard.service';
import type { DatePeriod } from '@/lib/types';

const querySchema = z.object({
  period: z.enum(['7d', '30d', '90d', 'mtd', 'last_month']).default('30d'),
  limit: z.coerce.number().min(1).max(50).default(10),
});

export const GET = withErrorHandler(async (req: Request) => {
  const session = await getAuthSession();
  const url = new URL(req.url);
  const params = querySchema.parse({
    period: url.searchParams.get('period') || '30d',
    limit: url.searchParams.get('limit') || '10',
  });
  const data = await getTopModels(
    session.orgId,
    params.period as DatePeriod,
    params.limit
  );
  return successResponse(data);
});
