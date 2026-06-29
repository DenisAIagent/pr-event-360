import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Précise le TYPE de demande et l'ARTISTE concerné dans les notifications d'acceptation/refus
 * (objet + corps), pour lever l'ambiguïté en cas de demandes multiples. Met à jour les templates
 * DÉJÀ stockés des événements existants (les nouveaux events sont semés depuis les défauts à jour).
 * Variables : {{firstName}} {{type}} {{artist}} {{event}} {{slot}}.
 */
const T: Record<string, Record<string, { subject: string; body: string }>> = {
  request_accepted: {
    fr: { subject: '{{type}} – {{artist}} : demande acceptée', body: 'Bonjour {{firstName}}, votre demande « {{type}} » concernant {{artist}} ({{event}}) a été acceptée.{{slot}}' },
    en: { subject: '{{type}} – {{artist}}: request accepted', body: 'Hello {{firstName}}, your “{{type}}” request for {{artist}} ({{event}}) has been accepted.{{slot}}' },
    pt: { subject: '{{type}} – {{artist}}: pedido aceite', body: 'Olá {{firstName}}, o seu pedido «{{type}}» para {{artist}} ({{event}}) foi aceite.{{slot}}' },
    es: { subject: '{{type}} – {{artist}}: solicitud aceptada', body: 'Hola {{firstName}}, tu solicitud «{{type}}» para {{artist}} ({{event}}) ha sido aceptada.{{slot}}' },
  },
  request_rejected: {
    fr: { subject: '{{type}} – {{artist}} : demande non retenue', body: 'Bonjour {{firstName}}, votre demande « {{type}} » concernant {{artist}} ({{event}}) n’a pas pu être retenue.' },
    en: { subject: '{{type}} – {{artist}}: request not approved', body: 'Hello {{firstName}}, your “{{type}}” request for {{artist}} ({{event}}) could not be approved.' },
    pt: { subject: '{{type}} – {{artist}}: pedido não aprovado', body: 'Olá {{firstName}}, o seu pedido «{{type}}» para {{artist}} ({{event}}) não pôde ser aprovado.' },
    es: { subject: '{{type}} – {{artist}}: solicitud no aprobada', body: 'Hola {{firstName}}, tu solicitud «{{type}}» para {{artist}} ({{event}}) no pudo ser aprobada.' },
  },
};

export async function up(pgm: MigrationBuilder): Promise<void> {
  for (const [trigger, byLang] of Object.entries(T)) {
    for (const [lang, txt] of Object.entries(byLang)) {
      pgm.sql(
        `UPDATE email_templates SET subject = $$${txt.subject}$$, body = $$${txt.body}$$
         WHERE trigger_key = '${trigger}' AND lang = '${lang}' AND channel = 'email'`,
      );
    }
  }
}

export async function down(): Promise<void> {
  // Pas de retour arrière du contenu (amélioration éditoriale).
}
