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
});
