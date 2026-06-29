import type { DeliveryResult, EmailMessage, EmailProvider, SmsMessage, SmsProvider } from './types';

const BREVO_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_SMS_URL = 'https://api.brevo.com/v3/transactionalSMS/sms';

export interface BrevoEmailConfig {
  apiKey: string;
  senderEmail: string;
  senderName: string;
}

/** Email transactionnel via l'API Brevo. */
export function createBrevoEmailProvider(config: BrevoEmailConfig): EmailProvider {
  return {
    name: 'brevo',
    async send(message: EmailMessage): Promise<DeliveryResult> {
      try {
        const res = await fetch(BREVO_EMAIL_URL, {
          method: 'POST',
          headers: {
            'api-key': config.apiKey,
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({
            // L'adresse d'envoi reste l'expéditeur vérifié Brevo ; seul le NOM affiché varie
            // (ex. « Rock In Rio Press Team ») pour les emails liés à un événement.
            sender: { email: config.senderEmail, name: message.fromName ?? config.senderName },
            to: [{ email: message.to }],
            subject: message.subject,
            // HTML si fourni (newsletters), sinon corps texte (Brevo génère le HTML).
            ...(message.html ? { htmlContent: message.html } : { textContent: message.body }),
          }),
        });
        if (!res.ok) {
          return { status: 'failed', provider: 'brevo', error: await errorText(res) };
        }
        const json = (await res.json().catch(() => ({}))) as { messageId?: string };
        return { status: 'sent', provider: 'brevo', providerMessageId: json.messageId };
      } catch (err) {
        return { status: 'failed', provider: 'brevo', error: messageOf(err) };
      }
    },
  };
}

export interface BrevoSmsConfig {
  apiKey: string;
  sender: string; // alphanumérique, <= 11 caractères
}

/** SMS transactionnel via l'API Brevo (alternative à Twilio). */
export function createBrevoSmsProvider(config: BrevoSmsConfig): SmsProvider {
  return {
    name: 'brevo',
    async send(message: SmsMessage): Promise<DeliveryResult> {
      try {
        const res = await fetch(BREVO_SMS_URL, {
          method: 'POST',
          headers: {
            'api-key': config.apiKey,
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({
            sender: config.sender.slice(0, 11),
            recipient: message.to,
            content: message.body,
            type: 'transactional',
          }),
        });
        if (!res.ok) {
          return { status: 'failed', provider: 'brevo', error: await errorText(res) };
        }
        const json = (await res.json().catch(() => ({}))) as { messageId?: string | number };
        return { status: 'sent', provider: 'brevo', providerMessageId: String(json.messageId ?? '') };
      } catch (err) {
        return { status: 'failed', provider: 'brevo', error: messageOf(err) };
      }
    },
  };
}

async function errorText(res: Response): Promise<string> {
  const body = await res.text().catch(() => '');
  return `HTTP ${res.status} ${body}`.trim();
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : 'Erreur réseau';
}
