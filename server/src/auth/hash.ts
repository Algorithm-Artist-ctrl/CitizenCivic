import crypto from 'crypto';

/**
 * Creates a Django-compatible pbkdf2_sha256 password hash.
 * Format: pbkdf2_sha256$<iterations>$<salt>$<hash>
 */
export function hashPassword(
  password: string,
  iterations = 600000,
  salt = crypto.randomBytes(16).toString('base64')
): string {
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64');
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

/**
 * Verifies a plaintext password against a stored password hash.
 * Supports Django's pbkdf2_sha256 and timing-safe comparison.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  const parts = storedHash.split('$');
  if (parts.length === 4 && parts[0] === 'pbkdf2_sha256') {
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const expectedHash = parts[3];

    try {
      const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64');
      const expectedBuffer = Buffer.from(expectedHash);
      const derivedBuffer = Buffer.from(derivedKey);

      if (expectedBuffer.length !== derivedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, derivedBuffer);
    } catch {
      return false;
    }
  }

  return false;
}
