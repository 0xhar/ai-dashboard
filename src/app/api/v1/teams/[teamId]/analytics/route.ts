import { getAuthSession } from '@/lib/auth/middleware';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import * as teamsService from '@/lib/services/teams.service';
import type { DatePeriod } from '@/lib/types';

export const GET = withErrorHandler(async (req: Request, context: unknown) => {
  const session = await getAuthSession();
  const { teamId } = await (context as { params: Promise<{ teamId: string }> })
    .params;

  // Verify team belongs to org
  await teamsService.getTeam(session.orgId, teamId);

  const url = new URL(req.url);
  const period = (url.searchParams.get('period') || '30d') as DatePeriod;

  const analytics = await teamsService.getTeamAnalytics(teamId, period);
  return successResponse(analytics);
});
