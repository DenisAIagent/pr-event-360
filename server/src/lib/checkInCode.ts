import { createHmac, timingSafeEqual } from 'node:crypto';
import { loadEnv } from '../config/env';

/**
 * Code QR de check-in d'arrivée (accréditation).
 * Format : pr360ci1.<payload_b64url>.<hmac_b64url>
 * payload JSON : { e: eventId, j: journalistId }
 * Signature HMAC-SHA256 avec JWT_SECRET (même secret de plateforme).
 */

const PREFIX = 'pr360ci1';

function b64url(buf: Buffer | string): string {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf, 'utf8');
  return b.toString('base64url');
}

function hmac(data: string): string {
  return createHmac('sha256', loadEnv().JWT_SECRET).update(data).digest('base64url');
}

export function encodeCheckInCode(eventId: string, journalistId: string): string {
  const payload = b64url(JSON.stringify({ e: eventId, j: journalistId, v: 1 }));
  const sig = hmac(`${PREFIX}.${payload}`);
  return `${PREFIX}.${payload}.${sig}`;
}

export function decodeCheckInCode(
  code: string,
): { eventId: string; journalistId: string } | null {
  const parts = code.trim().split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  const [, payload, sig] = parts;
  if (!payload || !sig) return null;
  const expected = hmac(`${PREFIX}.${payload}`);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      e?: string;
      j?: string;
    };
    if (!json.e || !json.j) return null;
    return { eventId: json.e, journalistId: json.j };
  } catch {
    return null;
  }
}
