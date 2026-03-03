import { z } from 'zod';
import { getAuthSession } from '@/lib/auth/middleware';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import { ValidationError, PlanLimitError } from '@/lib/api/errors';
import * as teamsService from '@/lib/services/teams.service';
import { checkLimit } from '@/lib/features/gates';
import type { PlanTier } from '@/lib/types';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  monthlyBudgetCents: z.number().int().min(0).optional(),
});

export const GET = withErrorHandler(async () => {
  const session = await getAuthSession();
  const teamList = await teamsService.listTeams(session.orgId);
  return successResponse(teamList);
});

export const POST = withErrorHandler(async (req: Request) => {
  const session = await getAuthSession();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  // Check plan limits
  const currentCount = await teamsService.countTeams(session.orgId);
  if (!checkLimit(session.plan as PlanTier, 'maxTeams', currentCount)) {
    throw new PlanLimitError(
      'Team limit reached. Upgrade to create more teams.'
    );
  }

  const team = await teamsService.createTeam(
    session.orgId,
    parsed.data.name,
    parsed.data.slug,
    parsed.data.monthlyBudgetCents
  );

  return successResponse(team, 201);
});
