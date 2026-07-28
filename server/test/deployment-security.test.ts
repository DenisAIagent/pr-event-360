import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('configuration Docker locale', () => {
  it('ne publie PostgreSQL que sur loopback et ne contient plus le mot de passe littéral historique', () => {
    const compose = readFileSync(resolve(import.meta.dirname, '../../docker-compose.yml'), 'utf8');
    expect(compose).toContain('127.0.0.1:5432:5432');
    expect(compose).not.toContain('POSTGRES_PASSWORD: prevent\n');
    expect(compose).toContain('PR360_DEV_DB_PASSWORD');
  });
});
