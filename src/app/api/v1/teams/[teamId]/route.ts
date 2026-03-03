import { z } from 'zod';
import { getAuthSession } from '@/lib/auth/middleware';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import { ValidationError } from '@/lib/api/errors';
import * as teamsService from '@/lib/services/teams.service';

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  monthlyBudgetCents: z.number().int().min(0).nullable().optional(),
});

async function getTeamId(context: unknown): Promise<string> {
  const { teamId } = await (context as { params: Promise<{ teamId: string }> })
    .params;
  return teamId;
}

export const GET = withErrorHandler(async (_req: Request, context: unknown) => {
  const session = await getAuthSession();
  const teamId = await getTeamId(context);
  const team = await teamsService.getTeam(session.orgId, teamId);
  return successResponse(team);
});

export const PATCH = withErrorHandler(
  async (req: Request, context: unknown) => {
    const session = await getAuthSession();
    const teamId = await getTeamId(context);
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const team = await teamsService.updateTeam(
      session.orgId,
      teamId,
      parsed.data
    );
    return successResponse(team);
  }
);

export const DELETE = withErrorHandler(
  async (_req: Request, context: unknown) => {
    const session = await getAuthSession();
    const teamId = await getTeamId(context);
    await teamsService.deleteTeam(session.orgId, teamId);
    return successResponse({ deleted: true });
  }
);
