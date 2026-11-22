import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

/**
 * notice/incoming/error/info: avisos grandes con fondo (piden atención).
 * success/quiet: avisos chicos sin fondo, con un punto (confirman algo, como "Llamada conectada").
 */
export type AlertTone = "notice" | "incoming" | "error" | "info" | "success" | "quiet";
const ICON: Partial<Record<AlertTone, IconName>> = { notice: "aviso", incoming: "llamar", error: "aviso", info: "subtitulos" };

/** Aviso visual (reemplaza tonos y timbres de llamada). `message={null}` lo oculta. */
export function VisualAlert({ message, tone = "notice", action }: { message: string | null; tone?: AlertTone; action?: ReactNode }) {
  if (!message) return null;
  const icon = ICON[tone];
  return (
    <div role="alert" className={cx("pu-alert", `pu-alert-${tone}`)}>
      {icon ? <Icon name={icon} size={28} /> : <span className="dot" aria-hidden />}
      <span className="msg">{message}</span>
      {action}
    </div>
  );
}
