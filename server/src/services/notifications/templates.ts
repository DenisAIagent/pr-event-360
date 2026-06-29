import type { Lang, RequestType } from '@pr-event-360/core';

/** Déclencheurs de notification (clés stables, partagées DB ↔ code). */
export const TRIGGERS = {
  ACCREDITATION_RECEIVED: 'accreditation_received',
  ACCREDITATION_ACCEPTED: 'accreditation_accepted',
  ACCREDITATION_REJECTED: 'accreditation_rejected',
  REQUEST_RECEIVED: 'request_received',
  REQUEST_ACCEPTED: 'request_accepted',
  REQUEST_REJECTED: 'request_rejected',
} as const;

export type TriggerKey = (typeof TRIGGERS)[keyof typeof TRIGGERS];

interface TemplateText {
  subject: string;
  body: string;
}

/**
 * Textes par défaut, par déclencheur et par langue. Semés en base à la création
 * de l'événement, puis librement éditables par l'attaché. Variables : {{firstName}},
 * {{event}}, {{link}}, {{artist}}, {{slot}}.
 */
export const DEFAULT_TEMPLATE_TEXT: Record<TriggerKey, Record<Lang, TemplateText>> = {
  accreditation_received: {
    fr: { subject: 'Demande d’accréditation bien reçue', body: 'Bonjour {{firstName}}, nous avons bien reçu votre demande d’accréditation pour {{event}}. Nous reviendrons vers vous après examen.' },
    en: { subject: 'Accreditation request received', body: 'Hello {{firstName}}, we have received your accreditation request for {{event}}. We will get back to you after review.' },
    pt: { subject: 'Pedido de acreditação recebido', body: 'Olá {{firstName}}, recebemos o seu pedido de acreditação para {{event}}. Entraremos em contacto após a análise.' },
    es: { subject: 'Solicitud de acreditación recibida', body: 'Hola {{firstName}}, hemos recibido tu solicitud de acreditación para {{event}}. Te responderemos tras la revisión.' },
  },
  accreditation_accepted: {
    fr: { subject: 'Accréditation acceptée — accédez à vos demandes', body: 'Bonjour {{firstName}}, votre accréditation pour {{event}} est acceptée. Accédez à votre espace pour soumettre vos demandes : {{link}}' },
    en: { subject: 'Accreditation accepted — submit your requests', body: 'Hello {{firstName}}, your accreditation for {{event}} is accepted. Access your space to submit requests: {{link}}' },
    pt: { subject: 'Acreditação aceite — envie os seus pedidos', body: 'Olá {{firstName}}, a sua acreditação para {{event}} foi aceite. Aceda ao seu espaço para enviar pedidos: {{link}}' },
    es: { subject: 'Acreditación aceptada — envía tus solicitudes', body: 'Hola {{firstName}}, tu acreditación para {{event}} ha sido aceptada. Accede a tu espacio para enviar solicitudes: {{link}}' },
  },
  accreditation_rejected: {
    fr: { subject: 'Accréditation non retenue', body: 'Bonjour {{firstName}}, votre demande d’accréditation pour {{event}} n’a pas été retenue. Merci de votre intérêt.' },
    en: { subject: 'Accreditation not approved', body: 'Hello {{firstName}}, your accreditation request for {{event}} was not approved. Thank you for your interest.' },
    pt: { subject: 'Acreditação não aprovada', body: 'Olá {{firstName}}, o seu pedido de acreditação para {{event}} não foi aprovado. Obrigado pelo interesse.' },
    es: { subject: 'Acreditación no aprobada', body: 'Hola {{firstName}}, tu solicitud de acreditación para {{event}} no fue aprobada. Gracias por tu interés.' },
  },
  request_received: {
    fr: { subject: 'Demande bien reçue', body: 'Bonjour {{firstName}}, votre demande a bien été reçue et sera traitée par notre équipe.' },
    en: { subject: 'Request received', body: 'Hello {{firstName}}, your request has been received and will be processed by our team.' },
    pt: { subject: 'Pedido recebido', body: 'Olá {{firstName}}, o seu pedido foi recebido e será tratado pela nossa equipa.' },
    es: { subject: 'Solicitud recibida', body: 'Hola {{firstName}}, tu solicitud ha sido recibida y será tramitada por nuestro equipo.' },
  },
  request_accepted: {
    fr: { subject: '{{type}} – {{artist}} : demande acceptée', body: 'Bonjour {{firstName}}, votre demande « {{type}} » concernant {{artist}} ({{event}}) a été acceptée.{{slot}}{{reportage}}' },
    en: { subject: '{{type}} – {{artist}}: request accepted', body: 'Hello {{firstName}}, your “{{type}}” request for {{artist}} ({{event}}) has been accepted.{{slot}}{{reportage}}' },
    pt: { subject: '{{type}} – {{artist}}: pedido aceite', body: 'Olá {{firstName}}, o seu pedido «{{type}}» para {{artist}} ({{event}}) foi aceite.{{slot}}{{reportage}}' },
    es: { subject: '{{type}} – {{artist}}: solicitud aceptada', body: 'Hola {{firstName}}, tu solicitud «{{type}}» para {{artist}} ({{event}}) ha sido aceptada.{{slot}}{{reportage}}' },
  },
  request_rejected: {
    fr: { subject: '{{type}} – {{artist}} : demande non retenue', body: 'Bonjour {{firstName}}, votre demande « {{type}} » concernant {{artist}} ({{event}}) n’a pas pu être retenue.' },
    en: { subject: '{{type}} – {{artist}}: request not approved', body: 'Hello {{firstName}}, your “{{type}}” request for {{artist}} ({{event}}) could not be approved.' },
    pt: { subject: '{{type}} – {{artist}}: pedido não aprovado', body: 'Olá {{firstName}}, o seu pedido «{{type}}» para {{artist}} ({{event}}) não pôde ser aprovado.' },
    es: { subject: '{{type}} – {{artist}}: solicitud no aprobada', body: 'Hola {{firstName}}, tu solicitud «{{type}}» para {{artist}} ({{event}}) no pudo ser aprobada.' },
  },
};

/** Libellés humains du type de demande, par langue (variable {{type}} des notifications). */
export const REQUEST_TYPE_LABELS: Record<Lang, Record<RequestType, string>> = {
  fr: { interview: 'Interview', photo_report: 'Reportage photo', video_report: 'Reportage vidéo' },
  en: { interview: 'Interview', photo_report: 'Photo report', video_report: 'Video report' },
  pt: { interview: 'Entrevista', photo_report: 'Reportagem fotográfica', video_report: 'Reportagem em vídeo' },
  es: { interview: 'Entrevista', photo_report: 'Reportaje fotográfico', video_report: 'Reportaje en vídeo' },
};

/** Substitue les variables {{clé}} dans un texte ; toute clé inconnue → chaîne vide. */
export function renderTemplate(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => variables[key] ?? '');
}
