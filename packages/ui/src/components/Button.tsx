import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "md" | "lg";
  icon?: IconName;
  block?: boolean;
}

/** Primario (amarillo) una vez por pantalla; danger solo para Colgar; lg (64px) para Llamar/Contestar/Colgar. */
export function Button({ variant = "primary", size = "md", icon, block, className, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      {...rest}
      className={cx("pu-btn", `pu-btn-${variant}`, size === "lg" && "pu-btn-lg", block && "pu-btn-block", className)}
    >
      {icon && <Icon name={icon} size={size === "lg" ? 28 : 22} />}
      {children}
    </button>
  );
}
