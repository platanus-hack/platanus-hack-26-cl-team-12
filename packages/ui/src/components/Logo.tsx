import { cx } from "./cx";

/** El arco de Puente: punto celeste = cliente, punto claro = ejecutivo, arco amarillo = el puente. */
export function Logo({ variant = "wordmark", size = 40, tone = "color" }: { variant?: "wordmark" | "mark"; size?: number; tone?: "color" | "mono" }) {
  return (
    <span className={cx("pu-logo", tone === "mono" && "mono")} role="img" aria-label="Puente">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <path className="arch" d="M12 41a20 20 0 0 1 40 0" />
        <circle className="dot-c" cx={12} cy={41} r={6.5} />
        <circle className="dot-e" cx={52} cy={41} r={6.5} />
      </svg>
      {variant === "wordmark" && (
        <span className="word" style={{ fontSize: Math.round(size * 0.78) }}>
          Puente
        </span>
      )}
    </span>
  );
}
