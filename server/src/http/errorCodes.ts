/**
 * Catalogue des codes d'erreur PR Event 360. Chaque erreur exposée au client porte
 * un code stable `PRE-####` : il apparaît dans la notification côté client ET dans les
 * logs serveur (avec le requestId), pour identifier et tracer un incident précis.
 *
 * Convention : PRE-<classe><séquence>
 *   40xx = requête invalide / auth / permissions (4xx)     50xx = erreur serveur (5xx)
 * Ajouter un code = ajouter une entrée ici (ne jamais réutiliser un numéro retiré).
 */
export const ERROR_CODES = {
  // Génériques par statut HTTP (repli quand aucun code spécifique n'est fourni).
  BAD_REQUEST: 'PRE-4000',
  VALIDATION: 'PRE-4001',
  UNAUTHORIZED: 'PRE-4010',
  FORBIDDEN: 'PRE-4030',
  NOT_FOUND: 'PRE-4040',
  CONFLICT: 'PRE-4090',
  RATE_LIMITED: 'PRE-4290',
  INTERNAL: 'PRE-5000',

  // Authentification back-office.
  AUTH_INVALID_CREDENTIALS: 'PRE-4011',
  AUTH_ACCOUNT_DISABLED: 'PRE-4012',
  AUTH_SESSION_EXPIRED: 'PRE-4013',
  AUTH_MFA_CODE_INVALID: 'PRE-4014',
  AUTH_MFA_SETUP_REQUIRED: 'PRE-4031',
  CSRF_INVALID: 'PRE-4032',
  SUBSCRIPTION_INACTIVE: 'PRE-4033',

  // Espace journaliste.
  JSPACE_SESSION_EXPIRED: 'PRE-4015',
  JSPACE_ACCESS_LINK_INVALID: 'PRE-4016',
  JSPACE_NOT_ACCEPTED: 'PRE-4034',

  // Métier.
  ACCREDITATION_DUPLICATE: 'PRE-4091',
  UPLOAD_TOO_LARGE: 'PRE-4002',
  STAGE_NOT_IN_EVENT: 'PRE-4003',
  STORAGE_NOT_CONFIGURED: 'PRE-4004',
  BILLING_NOT_CONFIGURED: 'PRE-4005',
  WEBHOOK_SIGNATURE_INVALID: 'PRE-4006',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Code de repli à partir du statut HTTP quand aucun code explicite n'est fourni. */
export function defaultCodeForStatus(status: number): string {
  switch (status) {
    case 400:
      return ERROR_CODES.BAD_REQUEST;
    case 401:
      return ERROR_CODES.UNAUTHORIZED;
    case 403:
      return ERROR_CODES.FORBIDDEN;
    case 404:
      return ERROR_CODES.NOT_FOUND;
    case 409:
      return ERROR_CODES.CONFLICT;
    case 429:
      return ERROR_CODES.RATE_LIMITED;
    default:
      return status >= 500 ? ERROR_CODES.INTERNAL : ERROR_CODES.BAD_REQUEST;
  }
}
