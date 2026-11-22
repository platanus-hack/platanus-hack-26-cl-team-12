import type { ReactNode } from "react";
import { cx } from "./cx";
import { CallStatus } from "./CallStatus";
import { Figure } from "./Figure";
import { GlossChip } from "./GlossChip";
import { Icon } from "./Icon";

export interface SignCameraProps {
  state?: "off" | "detecting" | "paused";
  glosses?: string[];
  /** 0 a 1. */
  confidence?: number;
  /** El <video> real de la cámara. Sin él se muestra la figura de ejemplo. */
  video?: ReactNode;
  /** Decir (envía glosas_cliente) y Borrar. El cliente siempre confirma. */
  actions?: ReactNode;
}

/** Panel de cámara (v3): el cliente firma y ve las glosas reconocidas antes de decirlas. */
export function SignCamera({ state = "detecting", glosses = [], confidence, video, actions }: SignCameraProps) {
  const pct = confidence != null ? Math.round(confidence * 100) : null;
  return (
    <section className={cx("pu-cam", `pu-cam-${state}`)} aria-label="Cámara de señas">
      <div className="view">
        {state === "off" ? (
          <span className="pu-status">
            <Icon name="camara" size={20} /> Cámara apagada
          </span>
        ) : (
          (video ?? <Figure skin="body" body="body" hand="hand" points="pt" />)
        )}
        {state !== "off" && <div className="frame" aria-hidden />}
        {state !== "off" && (
          <span className="tag">
            <CallStatus state={state === "detecting" ? "live" : "idle"} label={state === "detecting" ? "Leyendo señas" : "Pausa"} />
          </span>
        )}
      </div>
      <div className="pu-chips" aria-live="polite" aria-label="Señas reconocidas">
        {glosses.length ? glosses.map((g, i) => <GlossChip key={`${i}-${g}`} gloss={g} />) : <GlossChip gloss="Firma una frase…" state="pending" />}
      </div>
      {pct != null && (
        <>
          <div className="meta">
            <span>Seguridad</span>
            <span className="t">{pct}%</span>
          </div>
          <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Seguridad del reconocimiento">
            <i style={{ width: `${pct}%` }} />
          </div>
        </>
      )}
      {actions}
    </section>
  );
}
