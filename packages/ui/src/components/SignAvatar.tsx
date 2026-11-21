import type { ReactNode } from "react";
import { Figure } from "./Figure";

export interface SignAvatarProps {
  /** De `glosas_para_senar.glosas`. Las usa el reproductor real; no se muestran como texto. */
  glosses: string[];
  /** Índice de la glosa que se está reproduciendo. */
  current?: number;
  /** De `glosas_para_senar.subtitulo`. Siempre visible, encima del avatar: el avatar complementa el texto. */
  subtitle?: string;
  /** El reproductor real (packages/avatar). Sin él se muestra la figura de ejemplo. */
  player?: ReactNode;
}

/** Panel de avatar (v4): hace las señas de lo que dice el ejecutivo, con el subtítulo encima. */
export function SignAvatar({ subtitle, player }: SignAvatarProps) {
  return (
    <section className="pu-avatar" aria-label="Avatar de señas">
      <div className="stage">
        {player ?? <Figure skin="skin" body="shirt" hand="hands" />}
        {subtitle && (
          <p className="cap" aria-live="polite">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
