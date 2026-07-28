import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Réglages d'intégration du back-office super-admin : regroupement par service et
 * diagnostic Cloudinary. Le diagnostic doit dire PRÉCISÉMENT ce qui cloche — c'est
 * tout son intérêt face au « Stockage non configuré » générique de signUpload.
 */

vi.mock('../src/services/settingsService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/settingsService')>();
  return { ...actual, getStorageSettings: vi.fn() };
});

import { getStorageSettings } from '../src/services/settingsService';
import { checkStorageConfiguration, resetPresetValidationCache } from '../src/services/storageService';

const FULL_CONFIG = {
  cloudName: 'demo-cloud',
  apiKey: '123456789012345',
  apiSecret: 'super-secret-value',
  uploadPreset: 'pr-event-360-signed',
};

/** Réponse `fetch` minimale. */
function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** Enchaîne les réponses attendues : d'abord /ping, puis /upload_presets/:name. */
function mockFetchSequence(...responses: Response[]): void {
  const fetchMock = vi.fn();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fetchMock);
}

function byId(result: { checks: { id: string; status: string; detail: string }[] }, id: string) {
  const check = result.checks.find((c) => c.id === id);
  if (!check) throw new Error(`Contrôle « ${id} » absent du diagnostic`);
  return check;
}

beforeEach(() => resetPresetValidationCache());
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('diagnostic Cloudinary', () => {
  it('signale les valeurs manquantes sans appeler Cloudinary', async () => {
    vi.mocked(getStorageSettings).mockResolvedValue({ cloudName: 'demo-cloud' });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await checkStorageConfiguration();

    expect(result.ok).toBe(false);
    expect(byId(result, 'config').status).toBe('failed');
    expect(byId(result, 'config').detail).toContain('CLOUDINARY_API_KEY');
    expect(byId(result, 'config').detail).toContain('CLOUDINARY_UPLOAD_PRESET');
    // Les contrôles suivants ne sont pas « en échec » mais non joués.
    expect(byId(result, 'credentials').status).toBe('skipped');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('distingue des identifiants refusés d’un compte injoignable', async () => {
    vi.mocked(getStorageSettings).mockResolvedValue(FULL_CONFIG);
    mockFetchSequence(jsonResponse(401, {}));

    const result = await checkStorageConfiguration();

    expect(result.ok).toBe(false);
    expect(byId(result, 'config').status).toBe('ok');
    expect(byId(result, 'credentials').status).toBe('failed');
    expect(byId(result, 'credentials').detail).toMatch(/API Key|API Secret/);
    expect(byId(result, 'preset').status).toBe('skipped');
  });

  it('nomme le preset introuvable', async () => {
    vi.mocked(getStorageSettings).mockResolvedValue(FULL_CONFIG);
    mockFetchSequence(jsonResponse(200, { status: 'ok' }), jsonResponse(404, {}));

    const result = await checkStorageConfiguration();

    expect(result.ok).toBe(false);
    expect(byId(result, 'credentials').status).toBe('ok');
    expect(byId(result, 'preset').status).toBe('failed');
    expect(byId(result, 'preset').detail).toContain('pr-event-360-signed');
  });

  it('refuse un preset non signé', async () => {
    vi.mocked(getStorageSettings).mockResolvedValue(FULL_CONFIG);
    mockFetchSequence(
      jsonResponse(200, { status: 'ok' }),
      jsonResponse(200, { unsigned: true, settings: { max_file_size: 10_000_000 } }),
    );

    const result = await checkStorageConfiguration();

    expect(result.ok).toBe(false);
    expect(byId(result, 'preset-signed').status).toBe('failed');
    expect(byId(result, 'preset-signed').detail).toMatch(/Unsigned/i);
    // Le plafond, lui, est correct : le diagnostic ne s'arrête pas au premier échec.
    expect(byId(result, 'preset-size').status).toBe('ok');
  });

  it('refuse un plafond de taille absent ou supérieur à 200 Mio', async () => {
    vi.mocked(getStorageSettings).mockResolvedValue(FULL_CONFIG);
    mockFetchSequence(
      jsonResponse(200, { status: 'ok' }),
      jsonResponse(200, { unsigned: false, settings: { max_file_size: 500 * 1024 * 1024 } }),
    );
    expect(byId(await checkStorageConfiguration(), 'preset-size').status).toBe('failed');

    resetPresetValidationCache();
    mockFetchSequence(jsonResponse(200, { status: 'ok' }), jsonResponse(200, { unsigned: false, settings: {} }));
    const missing = await checkStorageConfiguration();
    expect(byId(missing, 'preset-size').status).toBe('failed');
    expect(byId(missing, 'preset-size').detail).toContain('non définie');
  });

  it('valide une configuration complète et conforme', async () => {
    vi.mocked(getStorageSettings).mockResolvedValue(FULL_CONFIG);
    mockFetchSequence(
      jsonResponse(200, { status: 'ok' }),
      jsonResponse(200, { unsigned: false, settings: { max_file_size: 200 * 1024 * 1024 } }),
    );

    const result = await checkStorageConfiguration();

    expect(result.ok).toBe(true);
    expect(result.checks.every((c) => c.status === 'ok')).toBe(true);
  });

  it('ne divulgue jamais l’API Secret dans le diagnostic', async () => {
    vi.mocked(getStorageSettings).mockResolvedValue(FULL_CONFIG);
    mockFetchSequence(jsonResponse(200, { status: 'ok' }), jsonResponse(200, { unsigned: true, settings: {} }));

    const result = await checkStorageConfiguration();

    expect(JSON.stringify(result)).not.toContain(FULL_CONFIG.apiSecret);
  });

  it('traite un timeout réseau comme un échec explicite, pas comme une exception', async () => {
    vi.mocked(getStorageSettings).mockResolvedValue(FULL_CONFIG);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('The operation was aborted due to timeout');
      }),
    );

    const result = await checkStorageConfiguration();

    expect(result.ok).toBe(false);
    expect(byId(result, 'credentials').status).toBe('failed');
    expect(byId(result, 'credentials').detail).toMatch(/injoignable/i);
  });
});

describe('regroupement des réglages par service', () => {
  it('déclare chaque clé Cloudinary dans le groupe cloudinary', async () => {
    const { MANAGED_KEYS, SETTINGS_GROUPS } =
      await vi.importActual<typeof import('../src/services/settingsService')>(
        '../src/services/settingsService',
      );

    const cloudinaryKeys = MANAGED_KEYS.filter((k) => k.group === 'cloudinary').map((k) => k.key);
    expect(cloudinaryKeys).toEqual([
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'CLOUDINARY_UPLOAD_PRESET',
    ]);
    // Tout groupe déclaré possède au moins une clé, et toute clé vise un groupe connu.
    const groupIds = new Set(SETTINGS_GROUPS.map((g) => g.id));
    for (const k of MANAGED_KEYS) expect(groupIds.has(k.group)).toBe(true);
    for (const g of SETTINGS_GROUPS) {
      expect(MANAGED_KEYS.some((k) => k.group === g.id)).toBe(true);
    }
  });

  it('ne marque comme secrète que la valeur qui doit rester serveur', async () => {
    const { MANAGED_KEYS } = await vi.importActual<
      typeof import('../src/services/settingsService')
    >('../src/services/settingsService');
    const cloudinary = MANAGED_KEYS.filter((k) => k.group === 'cloudinary');
    // L'API Key voyage jusqu'au navigateur dans la signature : elle n'est pas secrète.
    expect(cloudinary.find((k) => k.key === 'CLOUDINARY_API_KEY')!.secret).toBe(false);
    expect(cloudinary.find((k) => k.key === 'CLOUDINARY_API_SECRET')!.secret).toBe(true);
  });
});
