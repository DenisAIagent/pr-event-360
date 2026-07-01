import { useEffect, useState } from 'react';

export interface CountdownLabels {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

const DEFAULT_LABELS: CountdownLabels = { days: 'j', hours: 'h', minutes: 'min', seconds: 's' };

/** Décompte vers une échéance, mis à jour chaque seconde. Appelle onExpired à 0. */
export function useCountdown(deadlineMs: number, onExpired?: () => void) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const total = Math.max(0, deadlineMs - now);

  useEffect(() => {
    if (total <= 0) onExpired?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const s = Math.floor(total / 1000);
  return {
    total,
    expired: total <= 0,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

/** Minuteur visuel (boîtes J/H/MIN/S). Réutilisable formulaire public, back-office, newsroom. */
export function Countdown({
  deadline,
  labels = DEFAULT_LABELS,
  onExpired,
}: {
  deadline: string;
  labels?: CountdownLabels;
  onExpired?: () => void;
}) {
  const c = useCountdown(Date.parse(deadline), onExpired);
  const units = [
    { value: c.days, label: labels.days },
    { value: c.hours, label: labels.hours },
    { value: c.minutes, label: labels.minutes },
    { value: c.seconds, label: labels.seconds },
  ];
  return (
    <div className="deadline-timer" role="timer">
      {units.map((u, i) => (
        <div className="deadline-unit" key={i}>
          <span className="deadline-value">{String(u.value).padStart(2, '0')}</span>
          <span className="deadline-unit-label">{u.label}</span>
        </div>
      ))}
    </div>
  );
}
