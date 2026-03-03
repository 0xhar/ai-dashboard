import { getAuthSession } from '@/lib/auth/middleware';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import * as teamsService from '@/lib/services/teams.service';

export const DELETE = withErrorHandler(
  async (_req: Request, context: unknown) => {
    const session = await getAuthSession();
    const { teamId, mappingId } = await (
      context as {
        params: Promise<{ teamId: string; mappingId: string }>;
      }
    ).params;

    // Verify team belongs to org
    await teamsService.getTeam(session.orgId, teamId);

    await teamsService.deleteTeamMapping(teamId, mappingId);
    return successResponse({ deleted: true });
  }
);
