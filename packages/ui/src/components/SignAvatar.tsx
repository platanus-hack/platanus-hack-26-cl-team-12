import type { ReactNode } from "react";
import { Interprete, type Apariencia } from "./Interprete";

export interface SignAvatarProps {
  /** De `glosas_para_senar.glosas`. Las usa el reproductor real; no se muestran como texto. */
  glosses: string[];
  /** Índice de la glosa que se está reproduciendo. */
  current?: number;
  /** De `glosas_para_senar.subtitulo`. Siempre visible, encima del video: el avatar complementa el texto. */
  subtitle?: string;
  /** Si está haciendo señas ahora (mueve las manos del intérprete de ejemplo). */
  signing?: boolean;
  /** Apariencia del intérprete dibujado (la personaliza el usuario en el menú). */
  apariencia?: Partial<Apariencia>;
  /** El reproductor real (packages/avatar). Sin él se muestra el intérprete de ejemplo. */
  player?: ReactNode;
}

/** Ventana de video del intérprete (v4), con el subtítulo encima como en una videollamada. */
export function SignAvatar({ subtitle, signing = false, apariencia, player }: SignAvatarProps) {
  return (
    <section className="pu-avatar" aria-label="Intérprete de lengua de señas">
      <div className="stage">
        {player ?? <Interprete signing={signing} apariencia={apariencia} />}
        <span className="tag">
          <span className="dot" aria-hidden /> Intérprete LSCh
        </span>
        {subtitle && (
          <p className="cap" aria-live="polite">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
