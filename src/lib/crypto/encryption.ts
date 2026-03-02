import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { deriveOrgKey } from './key-derivation';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getMasterKey(): string {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_MASTER_KEY environment variable is required');
  }
  return key;
}

export function encrypt(
  plaintext: string,
  orgId: string
): { ciphertext: string; iv: string } {
  const key = deriveOrgKey(getMasterKey(), orgId);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  // Append auth tag to ciphertext
  const combined = Buffer.concat([Buffer.from(encrypted, 'base64'), authTag]);

  return {
    ciphertext: combined.toString('base64'),
    iv: iv.toString('hex'),
  };
}

export function decrypt(ciphertext: string, iv: string, orgId: string): string {
  const key = deriveOrgKey(getMasterKey(), orgId);
  const combined = Buffer.from(ciphertext, 'base64');

  // Extract auth tag from end of ciphertext
  const encrypted = combined.subarray(0, combined.length - AUTH_TAG_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'), {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
