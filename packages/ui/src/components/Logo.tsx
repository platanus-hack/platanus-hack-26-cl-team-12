import { cx } from "./cx";

// Logo de Puente (diseño de Rafael, 22-11-2026): dos guiones celestes (lo que escribes o haces en señas) que se
// convierten en ondas de sonido amarillas (la voz que escucha la otra persona).
const BARRAS: [number, number][] = [
  [210, 46],
  [238, 100],
  [266, 148],
  [294, 84],
  [322, 120],
  [350, 36],
];

export function Logo({ variant = "wordmark", size = 40, tone = "color" }: { variant?: "wordmark" | "mark"; size?: number; tone?: "color" | "mono" }) {
  return (
    <span className={cx("pu-logo", tone === "mono" && "mono")} role="img" aria-label="Puente">
      <svg width={size * 1.75} height={size} viewBox="92 140 276 158" aria-hidden>
        <rect className="dot-c" x={100} y={215} width={42} height={9} rx={4.5} />
        <rect className="dot-c" x={162} y={215} width={23} height={9} rx={4.5} />
        {BARRAS.map(([cx_, h]) => (
          <rect key={cx_} className="barra" x={cx_ - 9} y={219 - h / 2} width={18} height={h} rx={9} />
        ))}
      </svg>
      {variant === "wordmark" && (
        <span className="word" style={{ fontSize: Math.round(size * 0.72) }}>
          Puente
        </span>
      )}
    </span>
  );
}
