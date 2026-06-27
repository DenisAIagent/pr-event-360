import crypto from 'node:crypto';

/**
 * TOTP (RFC 6238) implémenté avec node:crypto — compatible avec Google
 * Authenticator, Authy, 1Password… (SHA-1, 6 chiffres, période 30 s).
 * Aucune dépendance externe (évite les soucis d'interop CJS/ESM).
 */

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Secret base32 (160 bits aléatoires). */
export function generateSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return (code % 1_000_000).toString().padStart(6, '0');
}

/** Vérifie un code TOTP avec une tolérance de ±`window` fenêtres de 30 s. */
export function verifyTotp(token: string, secret: string, window = 1): boolean {
  const t = token.trim();
  if (!/^\d{6}$/.test(t)) return false;
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let w = -window; w <= window; w++) {
    if (hotp(secret, counter + w) === t) return true;
  }
  return false;
}

/** URI otpauth:// à encoder dans le QR code. */
export function keyuri(label: string, issuer: string, secret: string): string {
  const enc = encodeURIComponent;
  return (
    `otpauth://totp/${enc(issuer)}:${enc(label)}` +
    `?secret=${secret}&issuer=${enc(issuer)}&algorithm=SHA1&digits=6&period=30`
  );
}
