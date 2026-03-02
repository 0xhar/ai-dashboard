import { db } from '@/lib/db';
import { providerConnections } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { encrypt, decrypt } from '@/lib/crypto/encryption';
import { NotFoundError } from '@/lib/api/errors';

export async function createConnection(
  orgId: string,
  provider: string,
  displayName: string,
  credentials: Record<string, string>
) {
  const plaintext = JSON.stringify(credentials);
  const { ciphertext, iv } = encrypt(plaintext, orgId);

  const [connection] = await db
    .insert(providerConnections)
    .values({
      orgId,
      provider,
      displayName,
      credentialsEncrypted: ciphertext,
      credentialsIv: iv,
      status: 'active',
    })
    .returning();

  return connection;
}

export async function listConnections(orgId: string) {
  return db
    .select({
      id: providerConnections.id,
      provider: providerConnections.provider,
      displayName: providerConnections.displayName,
      status: providerConnections.status,
      lastSyncedAt: providerConnections.lastSyncedAt,
      lastError: providerConnections.lastError,
      createdAt: providerConnections.createdAt,
    })
    .from(providerConnections)
    .where(eq(providerConnections.orgId, orgId));
}

export async function getConnection(orgId: string, connectionId: string) {
  const [connection] = await db
    .select()
    .from(providerConnections)
    .where(
      and(
        eq(providerConnections.id, connectionId),
        eq(providerConnections.orgId, orgId)
      )
    )
    .limit(1);

  if (!connection) throw new NotFoundError('Connection not found');
  return connection;
}

export async function getDecryptedCredentials(
  orgId: string,
  connectionId: string
): Promise<Record<string, string>> {
  const conn = await getConnection(orgId, connectionId);
  const plaintext = decrypt(
    conn.credentialsEncrypted,
    conn.credentialsIv,
    orgId
  );
  return JSON.parse(plaintext);
}

export async function deleteConnection(orgId: string, connectionId: string) {
  const result = await db
    .delete(providerConnections)
    .where(
      and(
        eq(providerConnections.id, connectionId),
        eq(providerConnections.orgId, orgId)
      )
    )
    .returning();

  if (result.length === 0) throw new NotFoundError('Connection not found');
  return result[0];
}

export async function updateConnectionStatus(
  connectionId: string,
  status: string,
  error?: string | null
) {
  await db
    .update(providerConnections)
    .set({
      status,
      lastError: error ?? null,
      updatedAt: new Date(),
    })
    .where(eq(providerConnections.id, connectionId));
}

export async function updateSyncCursor(
  connectionId: string,
  cursor: Record<string, unknown>
) {
  await db
    .update(providerConnections)
    .set({
      syncCursor: cursor,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(providerConnections.id, connectionId));
}
