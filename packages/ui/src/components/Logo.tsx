import { cx } from "./cx";

// Logo de Bridge (22-11-2026): un puente colgante simple. Solo el puente, sin lo que conecta.
// Otras versiones (arco, arco con tirantes, viaducto) en apps/web/public/logo/.
export function Logo({ variant = "wordmark", size = 40, tone = "color" }: { variant?: "wordmark" | "mark"; size?: number; tone?: "color" | "mono" }) {
  return (
    <span className={cx("pu-logo", tone === "mono" && "mono")} role="img" aria-label="Bridge">
      <svg width={size} height={size} viewBox="4 22 112 72" aria-hidden className="puente">
        <path d="M34 30 V86 M86 30 V86" strokeWidth={9} />
        <path d="M8 76 Q34 30 34 30 Q60 70 86 30 Q86 30 112 76" strokeWidth={6} fill="none" />
        <path d="M8 76 H112" strokeWidth={9} />
      </svg>
      {variant === "wordmark" && (
        <span className="word" style={{ fontSize: Math.round(size * 0.72) }}>
          Bridge
        </span>
      )}
    </span>
  );
}
