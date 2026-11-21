import { cx } from "./cx";

export type CallState = "idle" | "ringing" | "connecting" | "live" | "ended";

const LABELS: Record<CallState, string> = {
  idle: "Lista para llamar",
  ringing: "Llamada entrante",
  connecting: "Conectando…",
  live: "En llamada",
  ended: "Llamada terminada",
};

export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Píldora de estado. Siempre con palabra: el color nunca es la única señal. */
export function CallStatus({ state = "idle", seconds, label }: { state?: CallState; seconds?: number; label?: string }) {
  return (
    <span className={cx("pu-status", `pu-status-${state}`)} role="status">
      <span className="pip" aria-hidden />
      <span>{label ?? LABELS[state]}</span>
      {state === "live" && seconds != null && <span className="t">{formatDuration(seconds)}</span>}
    </span>
  );
}
