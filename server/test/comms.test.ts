import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { renderBrandedEmail } from '../src/services/notifications/email';

vi.mock('../src/services/settingsService', () => ({
  getStorageSettings: vi.fn(),
}));
import * as settings from '../src/services/settingsService';
import { signUpload, ALLOWED_UPLOAD_FORMATS, MAX_UPLOAD_BYTES } from '../src/services/storageService';
import { AppError } from '../src/http/AppError';

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('renderBrandedEmail', () => {
  it('habille le contenu et applique la couleur d’accent', () => {
    const html = renderBrandedEmail({
      innerHtml: '<p>Salut</p>',
      branding: { accentColor: '#ff0000', logoUrl: null } as never,
      eventName: 'Festival X',
    });
    expect(html).toContain('<p>Salut</p>');
    expect(html).toContain('#ff0000');
    expect(html).toContain('Festival X');
  });

  it('échappe le nom de l’événement (anti-injection dans le gabarit)', () => {
    const html = renderBrandedEmail({ innerHtml: '<p>x</p>', eventName: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('rejette un logo à schéma dangereux et retombe sur le nom (anti-injection d’attribut)', () => {
    const html = renderBrandedEmail({
      innerHtml: '<p>x</p>',
      branding: { logoUrl: '" onerror="alert(1)' } as never,
      eventName: 'Festival X',
    });
    expect(html).not.toContain('onerror');
    expect(html).toContain('Festival X'); // en-tête textuel de repli
  });

  it('accepte une URL de logo https et l’échappe dans src', () => {
    const html = renderBrandedEmail({
      innerHtml: '<p>x</p>',
      branding: { logoUrl: 'https://cdn.example.com/logo.png' } as never,
      eventName: 'Festival X',
    });
    expect(html).toContain('src="https://cdn.example.com/logo.png"');
  });
});

describe('signUpload (Cloudinary)', () => {
  it('signe le preset plafonné avec les formats, le dossier et le timestamp', async () => {
    vi.mocked(settings.getStorageSettings).mockResolvedValue({
      cloudName: 'demo',
      apiKey: '123',
      apiSecret: 'secret',
      uploadPreset: 'pr360-secure',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ unsigned: false, settings: { max_file_size: MAX_UPLOAD_BYTES } }),
          { status: 200 },
        ),
      ),
    );
    const sig = await signUpload('evt-1', 1700);
    const formats = ALLOWED_UPLOAD_FORMATS.join(',');
    // Paramètres triés alphabétiquement : allowed_formats < folder < timestamp < upload_preset.
    const expected = createHash('sha1')
      .update(
        `allowed_formats=${formats}&folder=pr-event-360/evt-1&timestamp=1700` +
          `&upload_preset=pr360-securesecret`,
      )
      .digest('hex');
    expect(sig.signature).toBe(expected);
    expect(sig.allowedFormats).toBe(formats);
    expect(sig.folder).toBe('pr-event-360/evt-1');
    expect(sig.uploadPreset).toBe('pr360-secure');
    expect(sig.maxBytes).toBe(MAX_UPLOAD_BYTES);
    expect(sig.uploadUrl).toContain('demo');
  });

  it('refuse un preset sans plafond fournisseur ou au-dessus de 200 Mio', async () => {
    vi.mocked(settings.getStorageSettings).mockResolvedValue({
      cloudName: 'other-demo',
      apiKey: '456',
      apiSecret: 'secret',
      uploadPreset: 'unsafe',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ unsigned: false, settings: { max_file_size: MAX_UPLOAD_BYTES + 1 } }), {
          status: 200,
        }),
      ),
    );
    await expect(signUpload('evt-1', 1700)).rejects.toBeInstanceOf(AppError);
  });

  it('n’autorise pas les formats dangereux (SVG/HTML/exécutables) dans l’allowlist', () => {
    for (const bad of ['svg', 'html', 'js', 'exe', 'sh']) {
      expect(ALLOWED_UPLOAD_FORMATS).not.toContain(bad);
    }
  });

  it('lève si Cloudinary n’est pas configuré', async () => {
    vi.mocked(settings.getStorageSettings).mockResolvedValue({});
    await expect(signUpload('evt-1', 1700)).rejects.toBeInstanceOf(AppError);
  });
});
