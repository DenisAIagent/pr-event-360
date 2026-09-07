import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { pool } from '../db/pool';

/**
 * Métriques applicatives minimales, exposées au format texte Prometheus sur
 * /api/metrics. Volontairement sans dépendance (prom-client) : les séries sont
 * peu nombreuses et le format texte est trivial.
 *
 * Séries :
 *  - http_requests_total{method,route,status_class}   (compteur)
 *  - http_request_duration_ms_sum{method,route}       (somme, → moyenne)
 *  - http_request_duration_ms_max{method,route}       (max depuis le démarrage)
 *  - http_requests_in_flight                          (jauge)
 *  - pg_pool_clients_total / _idle / _waiting         (jauges)
 *  - process_uptime_seconds / process_memory_rss_bytes
 */

interface RouteStats {
  count: number;
  durationSumMs: number;
  durationMaxMs: number;
  byStatusClass: Map<string, number>;
}

const routes = new Map<string, RouteStats>();
let inFlight = 0;

/**
 * Séries maximales conservées. Garde-fou de cardinalité : une série par chemin
 * réellement routé est bornée par le code, mais rien n'empêche un appelant de
 * viser des chemins inexistants à l'infini.
 */
const MAX_SERIES = 200;

/** Étiquette unique pour tout ce qui n'a pas été routé (404, fichiers statiques). */
const UNROUTED = '<non routé>';

function routeKey(req: Request): string {
  // req.route n'est renseigné qu'après le routage → on lit au finish.
  const path = (req.route as { path?: string } | undefined)?.path;
  if (!path) {
    // Sans motif de route, l'ancienne version retombait sur `req.path`, c'est-à-dire
    // sur une valeur choisie par l'appelant : chaque chemin inexistant créait une
    // série permanente et faisait croître la mémoire sans borne (CWE-770), en plus
    // de polluer /api/metrics. Les requêtes non routées sont désormais agrégées.
    return UNROUTED;
  }
  return `${req.baseUrl || ''}${path}`;
}

export const metricsMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  inFlight += 1;
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    inFlight -= 1;
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    let key = `${req.method} ${routeKey(req)}`;
    let stats = routes.get(key);
    if (!stats) {
      // Plafond atteint : on agrège dans la série fourre-tout plutôt que d'en créer
      // une nouvelle (les compteurs restent justes, la mémoire reste bornée).
      if (routes.size >= MAX_SERIES) {
        key = `${req.method} ${UNROUTED}`;
        stats = routes.get(key);
      }
      if (!stats) {
        stats = { count: 0, durationSumMs: 0, durationMaxMs: 0, byStatusClass: new Map() };
        routes.set(key, stats);
      }
    }
    stats.count += 1;
    stats.durationSumMs += durationMs;
    if (durationMs > stats.durationMaxMs) stats.durationMaxMs = durationMs;
    const statusClass = `${Math.floor(res.statusCode / 100)}xx`;
    stats.byStatusClass.set(statusClass, (stats.byStatusClass.get(statusClass) ?? 0) + 1);
  });
  next();
};

function esc(label: string): string {
  return label.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Réinitialise les séries (tests). */
export function resetMetricsForTest(): void {
  routes.clear();
}

export function renderMetrics(): string {
  const lines: string[] = [
    '# HELP http_requests_total Requêtes HTTP traitées.',
    '# TYPE http_requests_total counter',
  ];
  for (const [key, stats] of routes) {
    const sp = key.indexOf(' ');
    const method = key.slice(0, sp);
    const route = key.slice(sp + 1);
    for (const [statusClass, count] of stats.byStatusClass) {
      lines.push(`http_requests_total{method="${esc(method)}",route="${esc(route)}",status_class="${statusClass}"} ${count}`);
    }
  }
  lines.push('# HELP http_request_duration_ms_sum Somme des durées (ms), pour moyenne.');
  lines.push('# TYPE http_request_duration_ms_sum counter');
  lines.push('# HELP http_request_duration_ms_max Durée maximale observée (ms).');
  lines.push('# TYPE http_request_duration_ms_max gauge');
  for (const [key, stats] of routes) {
    const sp = key.indexOf(' ');
    const labels = `method="${esc(key.slice(0, sp))}",route="${esc(key.slice(sp + 1))}"`;
    lines.push(`http_request_duration_ms_sum{${labels}} ${stats.durationSumMs.toFixed(1)}`);
    lines.push(`http_request_duration_ms_max{${labels}} ${stats.durationMaxMs.toFixed(1)}`);
  }
  lines.push('# HELP http_requests_in_flight Requêtes en cours de traitement.');
  lines.push('# TYPE http_requests_in_flight gauge');
  lines.push(`http_requests_in_flight ${inFlight}`);
  lines.push('# HELP pg_pool_clients Connexions du pool PostgreSQL.');
  lines.push('# TYPE pg_pool_clients gauge');
  lines.push(`pg_pool_clients{state="total"} ${pool.totalCount}`);
  lines.push(`pg_pool_clients{state="idle"} ${pool.idleCount}`);
  lines.push(`pg_pool_clients{state="waiting"} ${pool.waitingCount}`);
  lines.push('# HELP process_uptime_seconds Ancienneté du processus.');
  lines.push('# TYPE process_uptime_seconds gauge');
  lines.push(`process_uptime_seconds ${Math.floor(process.uptime())}`);
  lines.push('# HELP process_memory_rss_bytes Mémoire résidente du processus.');
  lines.push('# TYPE process_memory_rss_bytes gauge');
  lines.push(`process_memory_rss_bytes ${process.memoryUsage().rss}`);
  return lines.join('\n') + '\n';
}
