import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { buildBrandedEmail } from '../src/services/newsletterService';

vi.mock('../src/services/settingsService', () => ({
  getStorageSettings: vi.fn(),
}));
import * as settings from '../src/services/settingsService';
import { signUpload } from '../src/services/storageService';
import { AppError } from '../src/http/AppError';

afterEach(() => vi.clearAllMocks());

describe('buildBrandedEmail', () => {
  it('habille le contenu et applique la couleur d’accent', () => {
    const html = buildBrandedEmail('<p>Salut</p>', { accentColor: '#ff0000', logoUrl: null } as never, 'Festival X');
    expect(html).toContain('<p>Salut</p>');
    expect(html).toContain('#ff0000');
    expect(html).toContain('Festival X');
  });

  it('échappe le nom de l’événement (anti-injection dans le gabarit)', () => {
    const html = buildBrandedEmail('<p>x</p>', null, '<script>alert(1)</script>');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('signUpload (Cloudinary)', () => {
  it('génère une signature SHA-1 conforme et scope le dossier par événement', async () => {
    vi.mocked(settings.getStorageSettings).mockResolvedValue({
      cloudName: 'demo',
      apiKey: '123',
      apiSecret: 'secret',
    });
    const sig = await signUpload('evt-1', 1700);
    const expected = createHash('sha1').update('folder=pr-event-360/evt-1&timestamp=1700secret').digest('hex');
    expect(sig.signature).toBe(expected);
    expect(sig.folder).toBe('pr-event-360/evt-1');
    expect(sig.uploadUrl).toContain('demo');
    expect(sig.apiKey).toBe('123');
  });

  it('lève si Cloudinary n’est pas configuré', async () => {
    vi.mocked(settings.getStorageSettings).mockResolvedValue({});
    await expect(signUpload('evt-1', 1700)).rejects.toBeInstanceOf(AppError);
  });
});
