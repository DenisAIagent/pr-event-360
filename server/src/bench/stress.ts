/**
 * Banc d'essai LOCAL — volume de données + chemins de lecture lourds.
 * Usage : npx dotenv -e .env -- tsx src/bench/stress.ts <orgs> <eventsPerOrg> <jlPerEvent> <bigArtists> <bigJournalists> <reqPerJl>
 * Toutes les données portent le préfixe BENCH / bench- et sont nettoyées à chaque run.
 */
import { performance } from 'node:perf_hooks';
import { pool } from '../db/pool';
import { getQueue, getDashboard } from '../services/queueService';
import { generatePlanning } from '../services/planningService';
import { globalSearch } from '../services/searchService';
import { listEventsForUserService } from '../services/eventService';
import { priorityScore } from '@pr-event-360/core';

const SLOTS_PER_ARTIST = 16;

async function q(sql: string, params: unknown[] = []) {
  return pool.query(sql, params);
}
async function scalar<T = string>(sql: string, params: unknown[] = []): Promise<T> {
  return (await q(sql, params)).rows[0]?.['v'] as T;
}
async function timed<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const t = performance.now();
  const r = await fn();
  return [r, +(performance.now() - t).toFixed(1)];
}
const fmt = (n: number) => n.toLocaleString('fr-FR');

async function cleanBench() {
  await q("DELETE FROM events WHERE name LIKE 'BENCH%'"); // cascade enfants
  await q("DELETE FROM users WHERE email LIKE 'bench-%'");
  await q("DELETE FROM organizations WHERE slug LIKE 'bench-%'");
}

const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$bench$bench';

async function seedVolume(orgs: number, eventsPerOrg: number, jlPerEvent: number) {
  await q("INSERT INTO organizations (name, slug) SELECT 'BENCH Org '||g, 'bench-'||g FROM generate_series(1,$1) g", [orgs]);
  await q(
    `INSERT INTO users (email, password_hash, full_name, role, organization_id)
     SELECT 'bench-admin-'||o.slug||'@bench.local', $1, 'BENCH Admin', 'admin', o.id
     FROM organizations o WHERE o.slug LIKE 'bench-%'`,
    [DUMMY_HASH],
  );
  await q(
    `INSERT INTO events (owner_user_id, organization_id, name, languages)
     SELECT u.id, o.id, 'BENCH Event '||o.slug||'-'||g, '{fr}'::lang_code[]
     FROM organizations o JOIN users u ON u.organization_id=o.id AND u.email LIKE 'bench-admin-%'
     CROSS JOIN generate_series(1,$1) g WHERE o.slug LIKE 'bench-%'`,
    [eventsPerOrg],
  );
  await q("INSERT INTO event_configs (event_id) SELECT id FROM events WHERE name LIKE 'BENCH Event%'");
  await q(
    `INSERT INTO journalists (event_id, first_name, last_name, email, media, lang, consent, consent_at)
     SELECT e.id, 'Prenom'||g, 'Nom'||g, 'jl-'||g||'-'||substr(replace(e.id::text,'-',''),1,8)||'@bench.local',
            'Media'||(g%50), 'fr', true, now()
     FROM events e CROSS JOIN generate_series(1,$1) g WHERE e.name LIKE 'BENCH Event%'`,
    [jlPerEvent],
  );
}

async function seedBigEvent(artists: number, journalists: number, reqPerJl: number) {
  const org = await scalar("INSERT INTO organizations (name, slug) VALUES ('BENCH Big Org','bench-big') RETURNING id AS v");
  const admin = await scalar(
    "INSERT INTO users (email, password_hash, full_name, role, organization_id) VALUES ('bench-big-admin@bench.local',$1,'BENCH Big','admin',$2) RETURNING id AS v",
    [DUMMY_HASH, org],
  );
  const ev = await scalar(
    "INSERT INTO events (owner_user_id, organization_id, name, languages) VALUES ($1,$2,'BENCH BigEvent','{fr}'::lang_code[]) RETURNING id AS v",
    [admin, org],
  );
  await q('INSERT INTO event_configs (event_id) VALUES ($1)', [ev]);
  const stage = await scalar("INSERT INTO stages (event_id,name) VALUES ($1,'Main') RETURNING id AS v", [ev]);
  await q(
    "INSERT INTO artists (event_id,name,stage_id,itw_quota,photo_quota,video_quota) SELECT $1,'Artist '||g,$2,5,5,2 FROM generate_series(1,$3) g",
    [ev, stage, artists],
  );
  await q("INSERT INTO artist_windows (artist_id,day,start_time,end_time) SELECT a.id, current_date, '10:00','18:00' FROM artists a WHERE a.event_id=$1", [ev]);
  await q(
    `INSERT INTO interview_slots (artist_id,window_id,day,start_time,end_time)
     SELECT w.artist_id, w.id, w.day,
            ('10:00'::time + (g-1)*interval '20 min'),
            ('10:00'::time + (g-1)*interval '20 min' + interval '15 min')
     FROM artist_windows w JOIN artists a ON a.id=w.artist_id AND a.event_id=$1
     CROSS JOIN generate_series(1,$2) g`,
    [ev, SLOTS_PER_ARTIST],
  );
  await q(
    `INSERT INTO journalists (event_id,first_name,last_name,email,media,lang,consent,consent_at)
     SELECT $1,'Prenom'||g,'Nom'||g,'big-jl-'||g||'@bench.local','Media'||(g%50),'fr',true,now()
     FROM generate_series(1,$2) g`,
    [ev, journalists],
  );
  await q(
    `WITH arts AS (SELECT array_agg(id) ids, count(*) n FROM artists WHERE event_id=$1),
          jl AS (SELECT id, row_number() over () rn FROM journalists WHERE event_id=$1)
     INSERT INTO requests (event_id, journalist_id, type, artist_id, status, created_at)
     SELECT $1, jl.id,
            (ARRAY['interview','photo_report','video_report']::request_type[])[1+((jl.rn+g)%3)],
            (SELECT ids[1+((jl.rn+g)%n)] FROM arts),
            (ARRAY['acceptee','pas_encore_traite','en_cours','liste_attente']::request_status[])[1+((jl.rn+g)%4)],
            now() - ((jl.rn % 48)||' hours')::interval
     FROM jl CROSS JOIN generate_series(1,$2) g`,
    [ev, reqPerJl],
  );
  return { ev, org, admin };
}

async function main() {
  const [orgs, eventsPerOrg, jlPerEvent, bigArtists, bigJournalists, reqPerJl] = process.argv
    .slice(2)
    .map((n) => parseInt(n, 10));

  console.log(`\n=== PALIER : ${fmt(orgs)} orgs × ${eventsPerOrg} events × ${jlPerEvent} jl | BigEvent ${fmt(bigArtists)} artistes / ${fmt(bigJournalists)} jl / ${reqPerJl} req`);

  await cleanBench();
  const [, tSeedVol] = await timed(() => seedVolume(orgs, eventsPerOrg, jlPerEvent));
  const [big, tSeedBig] = await timed(() => seedBigEvent(bigArtists, bigJournalists, reqPerJl));
  console.log(`  seed: volume ${tSeedVol}ms + bigEvent ${tSeedBig}ms`);

  // Volumes réels
  const counts = (await q(
    `SELECT (SELECT count(*) FROM organizations) o, (SELECT count(*) FROM events) e,
            (SELECT count(*) FROM journalists) j, (SELECT count(*) FROM requests) r,
            (SELECT count(*) FROM interview_slots) s, pg_size_pretty(pg_database_size(current_database())) sz`,
  )).rows[0];
  console.log(`  base: ${fmt(+counts.o)} orgs · ${fmt(+counts.e)} events · ${fmt(+counts.j)} journalistes · ${fmt(+counts.r)} demandes · ${fmt(+counts.s)} créneaux · ${counts.sz}`);

  await q('ANALYZE'); // stats à jour pour le planificateur

  const actor = { sub: big.admin, email: 'bench-big-admin@bench.local', role: 'admin' as const, organizationId: big.org, isPlatformAdmin: false };

  const [queue, tQueue] = await timed(() => getQueue(big.ev));
  const [, tDash] = await timed(() => getDashboard(big.ev));
  const [search, tSearch] = await timed(() => globalSearch(actor, 'Prenom'));
  const [evList, tList] = await timed(() => listEventsForUserService(actor));
  const [plan, tPlan] = await timed(() => generatePlanning(big.ev));

  // Moteur core isolé (1M scores)
  const N = 1_000_000;
  const nowMs = Date.now();
  const [, tScore] = await timed(async () => {
    let acc = 0;
    for (let i = 0; i < N; i++) acc += priorityScore({ mediaWeight: i % 100, typeMultiplier: 1.5, createdAtMs: nowMs - (i % 48) * 3_600_000, nowMs });
    return acc;
  });

  console.log('  ── chemins lourds (ms) ──');
  console.log(`   file getQueue       : ${tQueue} ms  (${fmt(queue.length)} demandes triées)`);
  console.log(`   dashboard           : ${tDash} ms`);
  console.log(`   recherche ILIKE     : ${tSearch} ms  (${search.journalists.length} hits)`);
  console.log(`   liste events (org)  : ${tList} ms  (${evList.length} events)`);
  console.log(`   PLANNING generate   : ${tPlan} ms  (${plan.assigned ?? '?'} affectés)  ← N+1`);
  console.log(`   core priorityScore  : ${tScore} ms  / 1M appels (${Math.round(N / (tScore / 1000)).toLocaleString('fr-FR')} ops/s)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
