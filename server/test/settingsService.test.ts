import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/db/repositories/secretRepo', () => ({
  getAllSecrets: vi.fn(),
  upsertSecret: vi.fn(),
  deleteSecret: vi.fn(),
}));

import { encryptSecret } from '../src/lib/crypto';
import * as secretRepo from '../src/db/repositories/secretRepo';
import {
  __resetSettingsCache,
  getNotifSettings,
  getSettingsStatus,
  getStripeSettings,
} from '../src/services/settingsService';

beforeEach(() => {
  __resetSettingsCache();
  vi.mocked(secretRepo.getAllSecrets).mockReset();
});
afterEach(() => __resetSettingsCache());

describe('getNotifSettings — résolution DB > env', () => {
  it('utilise la valeur d’environnement par défaut (aucune surcharge DB)', async () => {
    vi.mocked(secretRepo.getAllSecrets).mockResolvedValue([]);
    const s = await getNotifSettings();
    // .env du projet est en mode live (configuré pendant la session).
    expect(['simulation', 'live']).toContain(s.mode);
    expect(s.emailProvider).toBe('brevo');
  });

  it('une surcharge DB (chiffrée) prend le dessus sur l’environnement', async () => {
    vi.mocked(secretRepo.getAllSecrets).mockResolvedValue([
      { key: 'NOTIFICATIONS_MODE', valueEncrypted: encryptSecret('live'), updatedAt: 'now' },
      { key: 'BREVO_SENDER_EMAIL', valueEncrypted: encryptSecret('db@sender.fr'), updatedAt: 'now' },
    ]);
    const s = await getNotifSettings();
    expect(s.mode).toBe('live');
    expect(s.brevo.senderEmail).toBe('db@sender.fr');
  });
});

describe('getSettingsStatus — masquage des secrets', () => {
  it('masque les clés secrètes et expose la source', async () => {
    vi.mocked(secretRepo.getAllSecrets).mockResolvedValue([
      { key: 'BREVO_API_KEY', valueEncrypted: encryptSecret('xkeysib-ABCDEFGH1234'), updatedAt: 'now' },
    ]);
    const { encryptionReady, items } = await getSettingsStatus();
    expect(encryptionReady).toBe(true);
    const apiKey = items.find((i) => i.key === 'BREVO_API_KEY')!;
    expect(apiKey.source).toBe('db');
    expect(apiKey.preview).toMatch(/1234$/); // 4 derniers caractères
    expect(apiKey.preview).not.toContain('xkeysib'); // début masqué
  });

  it('expose le groupe Stripe et marque les Price IDs optionnels', async () => {
    vi.mocked(secretRepo.getAllSecrets).mockResolvedValue([]);
    const { groups, items } = await getSettingsStatus();
    expect(groups.some((g) => g.id === 'stripe')).toBe(true);
    const priceEvent = items.find((i) => i.key === 'STRIPE_PRICE_EVENT');
    expect(priceEvent?.optional).toBe(true);
    const secret = items.find((i) => i.key === 'STRIPE_SECRET_KEY');
    expect(secret?.secret).toBe(true);
    expect(secret?.optional).toBeFalsy();
  });
});

describe('getStripeSettings — résolution DB > env', () => {
  it('une surcharge DB de Price ID prend le dessus', async () => {
    vi.mocked(secretRepo.getAllSecrets).mockResolvedValue([
      { key: 'STRIPE_PRICE_EVENT', valueEncrypted: encryptSecret('price_from_db_xxx'), updatedAt: 'now' },
      { key: 'STRIPE_SECRET_KEY', valueEncrypted: encryptSecret('sk_test_from_db'), updatedAt: 'now' },
    ]);
    const s = await getStripeSettings();
    expect(s.priceEvent).toBe('price_from_db_xxx');
    expect(s.secretKey).toBe('sk_test_from_db');
  });
});
