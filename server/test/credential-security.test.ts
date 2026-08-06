import { describe, expect, it, vi } from 'vitest';
import { hashJournalistToken } from '../src/lib/token';
import { findJournalistByToken } from '../src/db/repositories/journalistRepo';
import { createPendingSignup } from '../src/db/repositories/pendingSignupRepo';
import { toAccreditationDto } from '../src/routes/admin/eventPipeline';

describe('credentials sensibles', () => {
  it('recherche un accès journaliste par hash et exige une expiration future', async () => {
    const db = { query: vi.fn(async () => ({ rows: [] })) };
    await findJournalistByToken('bearer-secret', db as never);
    const [sql, params] = db.query.mock.calls[0]!;
    expect(sql).toContain('token_hash = $1');
    expect(sql).toContain('token_expires_at > now()');
    expect(params).toEqual([hashJournalistToken('bearer-secret')]);
    expect(params).not.toContain('bearer-secret');
  });

  it('ne sérialise jamais le hash de mot de passe dans le DTO d’accréditation', () => {
    const dto = toAccreditationDto({
      id: 'journalist-1',
      eventId: 'event-1',
      firstName: 'Léa',
      lastName: null,
      email: 'lea@example.test',
      phone: null,
      media: null,
      mediaTypeId: null,
      audience: null,
      prevArticle: null,
      lang: 'fr',
      accreditationType: 'presse',
      accStatus: 'acceptee',
      commitPublish: true,
      publishDelayDays: 8,
      consent: true,
      passwordHash: 'argon2-secret-hash',
      passwordChangedAt: null,
      checkedInAt: null,
      createdAt: 'now',
    });
    expect(dto).not.toHaveProperty('passwordHash');
    expect(dto).not.toHaveProperty('token');
    expect(dto).toMatchObject({ id: 'journalist-1', hasPassword: true });
  });

  it('une nouvelle intention Stripe ne supprime pas celles du même email', async () => {
    const row = {
      id: 'pending-1',
      email: 'owner@example.test',
      org_name: 'Org',
      full_name: 'Owner',
      google_id: null,
      auth_provider: 'password' as const,
      stripe_session_id: null,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    const db = { query: vi.fn(async () => ({ rows: [row] })) };
    await createPendingSignup(
      {
        email: row.email,
        orgName: row.org_name,
        fullName: row.full_name,
        authProvider: 'password',
      },
      db as never,
    );
    expect(db.query).toHaveBeenCalledOnce();
    expect(db.query.mock.calls[0]![0]).toContain('INSERT INTO pending_signups');
    expect(db.query.mock.calls[0]![0]).not.toContain('DELETE');
  });
});
