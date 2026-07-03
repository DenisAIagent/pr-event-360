import { describe, expect, it } from 'vitest';
import { ERROR_CODES, defaultCodeForStatus } from '../src/http/errorCodes';
import { AppError } from '../src/http/AppError';

describe('defaultCodeForStatus', () => {
  it('mappe les statuts HTTP courants vers un code PRE-####', () => {
    expect(defaultCodeForStatus(400)).toBe(ERROR_CODES.BAD_REQUEST);
    expect(defaultCodeForStatus(401)).toBe(ERROR_CODES.UNAUTHORIZED);
    expect(defaultCodeForStatus(403)).toBe(ERROR_CODES.FORBIDDEN);
    expect(defaultCodeForStatus(404)).toBe(ERROR_CODES.NOT_FOUND);
    expect(defaultCodeForStatus(409)).toBe(ERROR_CODES.CONFLICT);
    expect(defaultCodeForStatus(429)).toBe(ERROR_CODES.RATE_LIMITED);
    expect(defaultCodeForStatus(500)).toBe(ERROR_CODES.INTERNAL);
    expect(defaultCodeForStatus(502)).toBe(ERROR_CODES.INTERNAL);
  });
});

describe('AppError.code', () => {
  it('porte un code explicite quand fourni', () => {
    expect(AppError.unauthorized('x', ERROR_CODES.AUTH_INVALID_CREDENTIALS).code).toBe('PRE-4011');
    expect(AppError.forbidden('x', ERROR_CODES.CSRF_INVALID).code).toBe('PRE-4032');
    expect(AppError.badRequest('x', undefined, ERROR_CODES.ACCREDITATION_DUPLICATE).code).toBe('PRE-4091');
  });

  it('laisse le code indéfini par défaut (repli sur le statut dans le handler)', () => {
    expect(AppError.notFound('x').code).toBeUndefined();
  });

  it('les codes du catalogue sont uniques', () => {
    const values = Object.values(ERROR_CODES);
    expect(new Set(values).size).toBe(values.length);
  });
});
