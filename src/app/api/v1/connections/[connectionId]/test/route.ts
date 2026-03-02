import { getAuthSession } from '@/lib/auth/middleware';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import * as connectionsService from '@/lib/services/connections.service';
import { getAdapter } from '@/lib/providers/registry';
import type { ProviderType } from '@/lib/types';

export const POST = withErrorHandler(
  async (_req: Request, context: unknown) => {
    const session = await getAuthSession();
    const { connectionId } = await (
      context as { params: Promise<{ connectionId: string }> }
    ).params;

    const connection = await connectionsService.getConnection(
      session.orgId,
      connectionId
    );
    const credentials = await connectionsService.getDecryptedCredentials(
      session.orgId,
      connectionId
    );

    const adapter = getAdapter(connection.provider as ProviderType);
    const result = await adapter.testCredentials(credentials);

    if (result.success) {
      await connectionsService.updateConnectionStatus(connectionId, 'active');
    } else {
      await connectionsService.updateConnectionStatus(
        connectionId,
        'error',
        result.error
      );
    }

    return successResponse(result);
  }
);
