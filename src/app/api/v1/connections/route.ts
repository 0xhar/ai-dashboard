import { z } from 'zod';
import { getAuthSession } from '@/lib/auth/middleware';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import { ValidationError, PlanLimitError } from '@/lib/api/errors';
import * as connectionsService from '@/lib/services/connections.service';
import { checkLimit } from '@/lib/features/gates';
import type { PlanTier } from '@/lib/types';

const createSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'aws_bedrock', 'litellm']),
  displayName: z.string().min(1).max(100),
  credentials: z.record(z.string(), z.string()),
});

export const GET = withErrorHandler(async () => {
  const session = await getAuthSession();
  const connections = await connectionsService.listConnections(session.orgId);
  return successResponse(connections);
});

export const POST = withErrorHandler(async (req: Request) => {
  const session = await getAuthSession();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  // Check plan limits
  const existing = await connectionsService.listConnections(session.orgId);
  if (
    !checkLimit(session.plan as PlanTier, 'maxConnections', existing.length)
  ) {
    throw new PlanLimitError(
      'Connection limit reached. Upgrade to add more providers.'
    );
  }

  const connection = await connectionsService.createConnection(
    session.orgId,
    parsed.data.provider,
    parsed.data.displayName,
    parsed.data.credentials
  );

  return successResponse(connection, 201);
});
