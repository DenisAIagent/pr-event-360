import type { EventBranding, Journalist } from '../../domain';
import { loadEnv } from '../../config/env';
import { getEmailProvider } from './providers';

const env = loadEnv();
const PLATFORM_ACCENT = '#1598d3';
const PLATFORM_NAME = 'PR Event 360';
const PLATFORM_LOGO = `${env.PUBLIC_BASE_URL}/brand/logo-pr-event-360.png`;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * URL d'image sûre pour un attribut `src` d'email : n'autorise que `http(s)://` ou une data URL
 * d'image bitmap (jamais SVG, jamais `javascript:`/`data:text/html`), et échappe l'attribut.
 * Renvoie `null` si le schéma n'est pas autorisé → l'appelant retombe sur un libellé texte.
 */
export function safeImageSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  const allowed = /^https?:\/\//i.test(url) || /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(url);
  return allowed ? escapeHtml(url) : null;
}

/** HTML → texte (aperçu / version texte). */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
}

/** Texte brut → HTML sûr : échappé, double saut = paragraphe, simple saut = <br>. */
export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** Bouton d'action stylé + lien brut en repli (clients qui n'affichent pas le bouton). */
export function ctaButton(url: string, label: string): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0;"><tr>` +
    `<td style="border-radius:8px;background:${PLATFORM_ACCENT};">` +
    `<a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">${escapeHtml(label)}</a>` +
    `</td></tr></table>` +
    `<p style="margin:0;font-size:12px;color:#9aa0a6;word-break:break-all;">${escapeHtml(url)}</p>`
  );
}

/** Remplace {{firstName}} / {{lastName}} dans un corps HTML. */
export function personalize(html: string, j: Pick<Journalist, 'firstName' | 'lastName'>): string {
  return html
    .replace(/\{\{\s*firstName\s*\}\}/g, escapeHtml(j.firstName))
    .replace(/\{\{\s*lastName\s*\}\}/g, escapeHtml(j.lastName ?? ''));
}

export interface BrandedEmail {
  innerHtml: string;
  branding?: EventBranding | null;
  eventName?: string | null;
  footer?: string;
}

/**
 * Habille un contenu HTML dans un gabarit email responsive en styles inline (compatibilité clients).
 * Avec `eventName` → en-tête aux couleurs de l'événement ; sinon → gabarit plateforme PR Event 360.
 */
export function renderBrandedEmail({ innerHtml, branding, eventName, footer }: BrandedEmail): string {
  const accent = branding?.accentColor ?? PLATFORM_ACCENT;
  const isEvent = Boolean(eventName);
  const logoSrc = safeImageSrc(branding?.logoUrl);
  const header = isEvent
    ? logoSrc
      ? `<img src="${logoSrc}" alt="${escapeHtml(eventName!)}" style="max-height:48px;max-width:220px;" />`
      : `<strong style="font-size:19px;color:#111;">${escapeHtml(eventName!)}</strong>`
    : `<img src="${PLATFORM_LOGO}" alt="${PLATFORM_NAME}" style="max-height:40px;max-width:200px;" />`;
  const footerText = footer ?? (isEvent ? `Vous recevez cet email dans le cadre de ${eventName}.` : `Envoyé par ${PLATFORM_NAME}.`);

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#1a1a2e;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr><td style="height:5px;background:${accent};line-height:5px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:24px 28px 6px;">${header}</td></tr>
        <tr><td style="padding:6px 28px 24px;font-size:15px;line-height:1.6;color:#1a1a2e;">${innerHtml}</td></tr>
        <tr><td style="padding:16px 28px;background:#fafafa;border-top:1px solid #eeeeee;color:#9aa0a6;font-size:12px;line-height:1.5;">${escapeHtml(footerText)}</td></tr>
      </table>
      <p style="color:#b0b4ba;font-size:11px;margin:14px 0 0;">PR&nbsp;Event&nbsp;360 — Votre orchestrateur de relations presse</p>
    </td></tr>
  </table>
  </body></html>`;
}

/** Nom d'expéditeur pour un email lié à un événement (ex. « Rock In Rio Press Team »). */
export function eventSenderName(eventName: string): string {
  return `${eventName} Press Team`;
}

export interface SendBrandedEmailInput extends BrandedEmail {
  to: string;
  subject: string;
  fromName?: string;
}

/** Construit le HTML de marque et l'envoie via le fournisseur (Brevo). */
export async function sendBrandedEmail(input: SendBrandedEmailInput) {
  const html = renderBrandedEmail(input);
  return (await getEmailProvider()).send({
    to: input.to,
    subject: input.subject,
    body: stripHtml(input.innerHtml),
    html,
    fromName: input.fromName,
  });
}
