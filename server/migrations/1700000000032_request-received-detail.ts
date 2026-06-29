import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Comme pour l'acceptation/refus, l'accusé de réception d'une demande précise désormais
 * le TYPE et l'ARTISTE (objet + corps). Met à jour les templates request_received déjà stockés.
 */
const T: Record<string, { subject: string; body: string }> = {
  fr: { subject: '{{type}} – {{artist}} : demande bien reçue', body: 'Bonjour {{firstName}}, votre demande « {{type}} » concernant {{artist}} ({{event}}) a bien été reçue et sera traitée par notre équipe.' },
  en: { subject: '{{type}} – {{artist}}: request received', body: 'Hello {{firstName}}, your “{{type}}” request for {{artist}} ({{event}}) has been received and will be processed by our team.' },
  pt: { subject: '{{type}} – {{artist}}: pedido recebido', body: 'Olá {{firstName}}, o seu pedido «{{type}}» para {{artist}} ({{event}}) foi recebido e será tratado pela nossa equipa.' },
  es: { subject: '{{type}} – {{artist}}: solicitud recibida', body: 'Hola {{firstName}}, tu solicitud «{{type}}» para {{artist}} ({{event}}) ha sido recibida y será tramitada por nuestro equipo.' },
};

export async function up(pgm: MigrationBuilder): Promise<void> {
  for (const [lang, txt] of Object.entries(T)) {
    pgm.sql(
      `UPDATE email_templates SET subject = $$${txt.subject}$$, body = $$${txt.body}$$
       WHERE trigger_key = 'request_received' AND lang = '${lang}' AND channel = 'email'`,
    );
  }
}

export async function down(): Promise<void> {
  // Amélioration éditoriale, pas de retour arrière.
}
