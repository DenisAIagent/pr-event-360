import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, isEncryptionAvailable } from '../src/lib/crypto';

describe('crypto AES-256-GCM', () => {
  it('chiffre puis déchiffre à l’identique (round-trip)', () => {
    expect(isEncryptionAvailable()).toBe(true); // APP_ENCRYPTION_KEY présent dans .env
    const secret = 'xkeysib-super-secret-1234';
    const blob = encryptSecret(secret);
    expect(blob).not.toContain(secret); // jamais en clair
    expect(blob.split('.')).toHaveLength(3); // iv.tag.ciphertext
    expect(decryptSecret(blob)).toBe(secret);
  });

  it('produit un chiffré différent à chaque appel (IV aléatoire)', () => {
    expect(encryptSecret('abc')).not.toBe(encryptSecret('abc'));
  });

  it('rejette un blob altéré (authentification GCM)', () => {
    const blob = encryptSecret('intègre');
    const [iv, tag, data] = blob.split('.');
    const tampered = [iv, tag, Buffer.from('falsifié').toString('base64')].join('.');
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
