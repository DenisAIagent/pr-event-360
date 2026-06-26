/**
 * Utilitaires de temps « heure du jour », sans Date ni fuseau horaire.
 * On manipule des minutes depuis minuit pour rester déterministe et testable.
 */

const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/** "HH:MM" ou "HH:MM:SS" → minutes depuis minuit. Lève si invalide. */
export function parseTimeToMinutes(time: string): number {
  const m = TIME_RE.exec(time.trim());
  if (!m) throw new Error(`Heure invalide : "${time}" (attendu HH:MM)`);
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) throw new Error(`Heure hors plage : "${time}"`);
  return hours * 60 + minutes;
}

/** Minutes depuis minuit → "HH:MM" (zéro-paddé). */
export function formatMinutesToTime(totalMinutes: number): string {
  if (!Number.isInteger(totalMinutes) || totalMinutes < 0 || totalMinutes > 24 * 60) {
    throw new Error(`Minutes hors plage : ${totalMinutes}`);
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
