import { cx } from "./cx";

// Logo de Bridge (22-11-2026, en iteración con Rafael): 10 barras cuyas alturas dibujan la silueta de un puente
// colgante (altas en las torres, bajas donde cae el cable), sin piso. Variantes en apps/web/public/logo/.
const ALTURAS = [18, 30, 56, 32, 16, 16, 32, 56, 30, 18];

export function Logo({ variant = "wordmark", size = 40, tone = "color" }: { variant?: "wordmark" | "mark"; size?: number; tone?: "color" | "mono" }) {
  return (
    <span className={cx("pu-logo", tone === "mono" && "mono")} role="img" aria-label="Bridge">
      <svg width={size * 1.375} height={size} viewBox="0 8 110 66" aria-hidden className="barras">
        {ALTURAS.map((h, i) => (
          <rect key={i} x={5 + i * 11 - 3} y={70 - h} width={6} height={h} rx={3} />
        ))}
      </svg>
      {variant === "wordmark" && (
        <span className="word" style={{ fontSize: Math.round(size * 0.72) }}>
          Bridge
        </span>
      )}
    </span>
  );
}
