import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

export type AlertTone = "notice" | "incoming" | "error" | "info";
const ICON: Record<AlertTone, IconName> = { notice: "aviso", incoming: "llamar", error: "aviso", info: "subtitulos" };

/** Aviso visual grande (reemplaza tonos y timbres de llamada). `message={null}` lo oculta. */
export function VisualAlert({ message, tone = "notice", action }: { message: string | null; tone?: AlertTone; action?: ReactNode }) {
  if (!message) return null;
  return (
    <div role="alert" className={cx("pu-alert", `pu-alert-${tone}`)}>
      <Icon name={ICON[tone]} size={28} />
      <span className="msg">{message}</span>
      {action}
    </div>
  );
}
