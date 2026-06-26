/**
 * Horloge injectable. Le moteur métier (packages/core) ne lit jamais l'heure
 * lui-même : la couche serveur la fournit via cette fonction, ce qui garde le
 * moteur déterministe et permet de simuler le temps dans les tests.
 */
export function nowMs(): number {
  return Date.now();
}
