import { auth } from './config';
import { UnauthorizedError, ForbiddenError } from '@/lib/api/errors';
import type { OrgRole } from '@/lib/types';
import { ROLE_HIERARCHY } from '@/lib/constants';

export interface AuthSession {
  userId: string;
  orgId: string;
  orgRole: OrgRole;
  plan: string;
}

export async function getAuthSession(): Promise<AuthSession> {
  const session = await auth();
  if (!session?.user?.orgId) {
    throw new UnauthorizedError();
  }
  return {
    userId: session.user.id,
    orgId: session.user.orgId,
    orgRole: session.user.orgRole as OrgRole,
    plan: session.user.plan,
  };
}

export function requireRole(userRole: OrgRole, requiredRole: OrgRole) {
  if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[requiredRole]) {
    throw new ForbiddenError('Insufficient permissions');
  }
}
