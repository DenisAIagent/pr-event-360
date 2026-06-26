import { getNotifSettings } from '../../settingsService';
import { createBrevoEmailProvider, createBrevoSmsProvider } from './brevo';
import { createTwilioSmsProvider } from './twilio';
import { simulationEmailProvider, simulationSmsProvider } from './simulation';
import type { EmailProvider, SmsProvider } from './types';

export type { DeliveryResult, EmailProvider, SmsProvider } from './types';

function require_(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Notifications en mode « live » : ${name} est requis`);
  return value;
}

/**
 * Fournisseur email actif selon la configuration EFFECTIVE (réglages en base
 * chiffrés, sinon variables d'environnement). Reconstruit à chaque appel pour
 * refléter immédiatement un changement de clés par l'admin.
 */
export async function getEmailProvider(): Promise<EmailProvider> {
  const settings = await getNotifSettings();
  if (settings.mode === 'simulation') return simulationEmailProvider;
  return createBrevoEmailProvider({
    apiKey: require_(settings.brevo.apiKey, 'BREVO_API_KEY'),
    senderEmail: require_(settings.brevo.senderEmail, 'BREVO_SENDER_EMAIL'),
    senderName: settings.brevo.senderName,
  });
}

/** Fournisseur SMS actif selon la configuration effective. */
export async function getSmsProvider(): Promise<SmsProvider> {
  const settings = await getNotifSettings();
  if (settings.mode === 'simulation') return simulationSmsProvider;
  if (settings.smsProvider === 'twilio') {
    return createTwilioSmsProvider({
      accountSid: require_(settings.twilio.accountSid, 'TWILIO_ACCOUNT_SID'),
      authToken: require_(settings.twilio.authToken, 'TWILIO_AUTH_TOKEN'),
      from: require_(settings.twilio.from, 'TWILIO_FROM'),
    });
  }
  return createBrevoSmsProvider({
    apiKey: require_(settings.brevo.apiKey, 'BREVO_API_KEY'),
    sender: settings.brevo.smsSender,
  });
}
