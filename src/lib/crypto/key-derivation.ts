import { createHmac } from 'crypto';

export function deriveOrgKey(masterKeyHex: string, orgId: string): Buffer {
  const masterKey = Buffer.from(masterKeyHex, 'hex');
  // HKDF-like derivation using HMAC-SHA256
  // salt = orgId, info = "provider-credentials"
  const prk = createHmac('sha256', orgId).update(masterKey).digest();
  const okm = createHmac('sha256', prk)
    .update('provider-credentials')
    .update(Buffer.from([1]))
    .digest();
  return okm;
}
