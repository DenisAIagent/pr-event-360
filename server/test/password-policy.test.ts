import { describe, expect, it } from 'vitest';
import { assertPasswordPolicy, passwordSchema, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from '../src/lib/passwordPolicy';
import { AppError } from '../src/http/AppError';

describe('politique de mot de passe', () => {
  it(`exige au moins ${MIN_PASSWORD_LENGTH} caractères`, () => {
    expect(() => assertPasswordPolicy('a'.repeat(MIN_PASSWORD_LENGTH - 1))).toThrow(AppError);
    expect(() => assertPasswordPolicy('a'.repeat(MIN_PASSWORD_LENGTH))).not.toThrow();
  });

  it(`refuse au-delà de ${MAX_PASSWORD_LENGTH} caractères`, () => {
    expect(() => assertPasswordPolicy('a'.repeat(MAX_PASSWORD_LENGTH + 1))).toThrow(AppError);
  });

  it('le schéma Zod aligne le service', () => {
    expect(passwordSchema().safeParse('short').success).toBe(false);
    expect(passwordSchema().safeParse('a'.repeat(MIN_PASSWORD_LENGTH)).success).toBe(true);
  });
});
