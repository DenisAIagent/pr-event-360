/** Résultat de livraison d'un message — persisté dans la table notifications. */
export interface DeliveryResult {
  status: 'simulated' | 'sent' | 'failed';
  provider: string; // 'simulation' | 'brevo' | 'twilio'
  providerMessageId?: string;
  error?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  /** Corps HTML optionnel ; si absent, le fournisseur génère un HTML depuis `body`. */
  html?: string;
}

export interface SmsMessage {
  to: string;
  body: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<DeliveryResult>;
}

export interface SmsProvider {
  readonly name: string;
  send(message: SmsMessage): Promise<DeliveryResult>;
}
