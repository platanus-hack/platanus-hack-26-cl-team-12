import { cx } from "./cx";

/** Barras de audio del logo (x del centro, alto). Centradas en y=32 dentro del viewBox 64×64. */
const BARRAS: ReadonlyArray<readonly [number, number]> = [
  [28.5, 10],
  [34.5, 22],
  [40.5, 32],
  [46.5, 18],
  [52.5, 26],
  [58.5, 8],
];

/**
 * "Texto que suena": dos guiones de texto (celeste, lo que escribe o firma el cliente)
 * que se convierten en barras de audio (amarillo, la voz que escucha el ejecutivo).
 */
export function Logo({ variant = "wordmark", size = 40, tone = "color" }: { variant?: "wordmark" | "mark"; size?: number; tone?: "color" | "mono" }) {
  return (
    <span className={cx("pu-logo", tone === "mono" && "mono")} role="img" aria-label="Puente">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <path className="texto" d="M5.5 32h8M18.5 32h4" />
        {BARRAS.map(([x, h]) => (
          <rect key={x} className="voz" x={x - 2} y={32 - h / 2} width={4} height={h} rx={2} />
        ))}
      </svg>
      {variant === "wordmark" && (
        <span className="word" style={{ fontSize: Math.round(size * 0.78) }}>
          Puente
        </span>
      )}
    </span>
  );
}
