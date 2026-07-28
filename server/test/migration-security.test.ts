import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('migration d’unicité des accréditations', () => {
  it('conserve les doublons historiques et applique l’unicité aux nouvelles lignes', () => {
    const migration = readFileSync(
      resolve(import.meta.dirname, '../migrations/1700000000038_journalist-unique-email.ts'),
      'utf8',
    );
    expect(migration).toContain('dedup_enforced boolean NOT NULL DEFAULT true');
    expect(migration).toContain('SET dedup_enforced = false');
    expect(migration).toContain('WHERE dedup_enforced');
    expect(migration).not.toContain('DELETE FROM journalists');
  });
});
