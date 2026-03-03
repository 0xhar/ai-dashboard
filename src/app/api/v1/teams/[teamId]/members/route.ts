import { z } from 'zod';
import { getAuthSession } from '@/lib/auth/middleware';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import { ValidationError } from '@/lib/api/errors';
import * as teamsService from '@/lib/services/teams.service';

const addMemberSchema = z.object({
  userId: z.string().uuid(),
});

export const POST = withErrorHandler(async (req: Request, context: unknown) => {
  const session = await getAuthSession();
  const { teamId } = await (context as { params: Promise<{ teamId: string }> })
    .params;

  // Verify team belongs to org
  await teamsService.getTeam(session.orgId, teamId);

  const body = await req.json();
  const parsed = addMemberSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  const membership = await teamsService.addTeamMember(
    teamId,
    parsed.data.userId
  );
  return successResponse(membership, 201);
});
