const COLORS = ['#1598d3', '#15315e', '#2fbf71', '#f5a623', '#07142f'];

/**
 * Petite explosion de confettis (DOM + Web Animations, sans dépendance).
 * Un moment de « delight » ponctuel. Respecte prefers-reduced-motion.
 */
export function fireConfetti(): void {
  if (typeof document === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:300;overflow:hidden';
  document.body.appendChild(root);

  const N = 38;
  for (let i = 0; i < N; i++) {
    const piece = document.createElement('span');
    const size = 6 + Math.round(Math.random() * 6);
    const left = 50 + (Math.random() - 0.5) * 32;
    const color = COLORS[i % COLORS.length];
    piece.style.cssText =
      `position:absolute;top:20%;left:${left}%;width:${size}px;height:${size}px;` +
      `background:${color};border-radius:${Math.random() > 0.5 ? '50%' : '2px'}`;
    root.appendChild(piece);

    const dx = (Math.random() - 0.5) * 340;
    const dy = 220 + Math.random() * 280;
    const rot = (Math.random() - 0.5) * 720;
    piece.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration: 1200 + Math.random() * 700, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'forwards' },
    );
  }

  setTimeout(() => root.remove(), 2300);
}
