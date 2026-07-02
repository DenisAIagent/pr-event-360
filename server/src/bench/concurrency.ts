/**
 * Banc d'essai LOCAL — concurrence / débit HTTP (autocannon) contre le serveur local.
 * Prérequis : serveur lancé sur :4000 + données BENCH BigEvent seedées (via stress.ts).
 * Usage : npm install -D autocannon && npx dotenv -e .env -- tsx src/bench/concurrency.ts
 */
import { pool } from '../db/pool';
import { signToken } from '../lib/jwt';

const BASE = 'http://localhost:4000';
type Autocannon = (opts: {
  url: string;
  connections: number;
  duration: number;
  headers?: Record<string, string>;
  timeout: number;
}) => Promise<{
  requests: { average: number };
  latency: { p50: number; p99: number };
  '2xx': number;
  non2xx: number;
  errors: number;
  timeouts: number;
}>;

let cannon: Autocannon | null = null;

async function loadAutocannon(): Promise<Autocannon> {
  if (cannon) return cannon;
  try {
    const mod = await import('autocannon');
    cannon = (mod.default ?? mod) as Autocannon;
    return cannon;
  } catch {
    throw new Error('Benchmark HTTP indisponible : installez autocannon localement avec `npm install -D autocannon`.');
  }
}

async function run(name: string, url: string, connections: number, headers?: Record<string, string>) {
  const autocannon = await loadAutocannon();
  const r = await autocannon({ url, connections, duration: 8, headers, timeout: 30 });
  const reqs = Math.round(r.requests.average);
  console.log(
    `  ${name.padEnd(24)} c=${String(connections).padStart(3)}  ${String(reqs).padStart(6)} req/s` +
      `  p50 ${String(r.latency.p50).padStart(5)}ms  p99 ${String(r.latency.p99).padStart(6)}ms` +
      `  2xx ${r['2xx']}  non2xx ${r.non2xx}  err ${r.errors}  timeout ${r.timeouts}`,
  );
}

async function main() {
  const ev = (
    await pool.query(
      `SELECT e.id, e.organization_id AS org, u.id AS uid
       FROM events e JOIN users u ON u.email='bench-big-admin@bench.local'
       WHERE e.name='BENCH BigEvent' LIMIT 1`,
    )
  ).rows[0];
  if (!ev) throw new Error("Seed le BENCH BigEvent d'abord (stress.ts).");

  const reqCount = (await pool.query('SELECT count(*)::int AS n FROM requests WHERE event_id=$1', [ev.id])).rows[0].n;
  const token = signToken({ sub: ev.uid, email: 'bench-big-admin@bench.local', role: 'admin', organizationId: ev.org, isPlatformAdmin: false });
  const auth = { authorization: `Bearer ${token}` };

  console.log(`\n=== CONCURRENCE (serveur local, BigEvent = ${reqCount.toLocaleString('fr-FR')} demandes) ===`);
  for (const c of [10, 50, 100, 200]) {
    await run('health (baseline Node)', `${BASE}/api/health`, c);
    await run('public form accred', `${BASE}/api/public/events/${ev.id}`, c);
    await run('file/queue (authed)', `${BASE}/api/admin/events/${ev.id}/requests`, c, auth);
    await run('dashboard (authed)', `${BASE}/api/admin/events/${ev.id}/dashboard`, c, auth);
    console.log('');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
