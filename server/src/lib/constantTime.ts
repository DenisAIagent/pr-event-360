/**
 * Outils de nivellement temporel : suppriment les oracles de timing sur les
 * surfaces publiques où la durée de traitement révèle l'existence d'un compte.
 */

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exécute `work` puis attend que la durée totale atteigne `floorMs`.
 * Les deux branches (compte existant / inexistant) répondent alors en un temps
 * indiscernable, à condition que `floorMs` couvre confortablement le pire cas.
 * Le plancher est appliqué même si `work` échoue (sinon l'erreur devient l'oracle).
 */
export async function withMinimumDuration<T>(floorMs: number, work: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    return await work();
  } finally {
    const remaining = floorMs - (Date.now() - startedAt);
    if (remaining > 0) await sleep(remaining);
  }
}

/**
 * Lance une tâche annexe sans l'attendre (envoi d'email…) : sa latence ne doit pas
 * transparaître dans le temps de réponse. Les échecs sont journalisés, jamais propagés
 * (une promesse rejetée non gérée ferait tomber le process).
 */
export function fireAndForget(label: string, work: () => Promise<unknown>): void {
  void Promise.resolve()
    .then(work)
    .catch((err: unknown) => {
      console.error(`[${label}] échec de la tâche différée`, err);
    });
}
