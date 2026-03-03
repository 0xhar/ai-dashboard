import { z } from 'zod';
import { getAuthSession } from '@/lib/auth/middleware';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import { ValidationError } from '@/lib/api/errors';
import * as teamsService from '@/lib/services/teams.service';

const createMappingSchema = z.object({
  connectionId: z.string().uuid(),
  providerEntityType: z.enum([
    'project',
    'workspace',
    'cost_tag',
    'api_key',
    'user',
  ]),
  providerEntityId: z.string().min(1),
  providerEntityName: z.string().optional(),
});

export const GET = withErrorHandler(async (_req: Request, context: unknown) => {
  const session = await getAuthSession();
  const { teamId } = await (context as { params: Promise<{ teamId: string }> })
    .params;

  // Verify team belongs to org
  await teamsService.getTeam(session.orgId, teamId);

  const mappings = await teamsService.listTeamMappings(teamId);
  return successResponse(mappings);
});

export const POST = withErrorHandler(async (req: Request, context: unknown) => {
  const session = await getAuthSession();
  const { teamId } = await (context as { params: Promise<{ teamId: string }> })
    .params;

  // Verify team belongs to org
  await teamsService.getTeam(session.orgId, teamId);

  const body = await req.json();
  const parsed = createMappingSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  const mapping = await teamsService.createTeamMapping(
    teamId,
    parsed.data.connectionId,
    parsed.data.providerEntityType,
    parsed.data.providerEntityId,
    parsed.data.providerEntityName
  );

  return successResponse(mapping, 201);
});
