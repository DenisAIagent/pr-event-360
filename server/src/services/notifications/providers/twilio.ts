import type { DeliveryResult, SmsMessage, SmsProvider } from './types';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  from: string; // numéro émetteur E.164 ou Messaging Service SID
}

/** SMS via l'API Twilio (form-urlencoded + auth Basic). */
export function createTwilioSmsProvider(config: TwilioConfig): SmsProvider {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

  return {
    name: 'twilio',
    async send(message: SmsMessage): Promise<DeliveryResult> {
      try {
        const form = new URLSearchParams({ To: message.to, From: config.from, Body: message.body });
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            authorization: `Basic ${auth}`,
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: form.toString(),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          return { status: 'failed', provider: 'twilio', error: `HTTP ${res.status} ${body}`.trim() };
        }
        const json = (await res.json().catch(() => ({}))) as { sid?: string };
        return { status: 'sent', provider: 'twilio', providerMessageId: json.sid };
      } catch (err) {
        return { status: 'failed', provider: 'twilio', error: err instanceof Error ? err.message : 'Erreur réseau' };
      }
    },
  };
}
