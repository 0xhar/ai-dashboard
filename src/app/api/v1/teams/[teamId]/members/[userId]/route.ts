import { getAuthSession } from '@/lib/auth/middleware';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import * as teamsService from '@/lib/services/teams.service';

export const DELETE = withErrorHandler(
  async (_req: Request, context: unknown) => {
    const session = await getAuthSession();
    const { teamId, userId } = await (
      context as { params: Promise<{ teamId: string; userId: string }> }
    ).params;

    // Verify team belongs to org
    await teamsService.getTeam(session.orgId, teamId);

    await teamsService.removeTeamMember(teamId, userId);
    return successResponse({ deleted: true });
  }
);
