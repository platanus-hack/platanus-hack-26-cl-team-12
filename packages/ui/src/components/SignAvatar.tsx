import type { ReactNode } from "react";
import { Figure } from "./Figure";
import { GlossChip } from "./GlossChip";

export interface SignAvatarProps {
  /** De `glosas_para_senar.glosas`. */
  glosses: string[];
  /** Índice de la glosa que se está reproduciendo. */
  current?: number;
  /** De `glosas_para_senar.subtitulo`. Siempre visible: el avatar complementa el texto. */
  subtitle?: string;
  /** El reproductor real (packages/avatar). Sin él se muestra la figura de ejemplo. */
  player?: ReactNode;
}

/** Panel de avatar (v4): firma lo que dice el ejecutivo, con la secuencia de glosas y el subtítulo. */
export function SignAvatar({ glosses, current = 0, subtitle, player }: SignAvatarProps) {
  return (
    <section className="pu-avatar" aria-label="Avatar de señas">
      <div className="stage">{player ?? <Figure skin="skin" body="shirt" hand="hands" />}</div>
      <div className="pu-chips">
        {glosses.map((g, i) => (
          <GlossChip key={`${i}-${g}`} gloss={g} state={i < current ? "done" : i === current ? "active" : "pending"} />
        ))}
      </div>
      {subtitle && <p className="sub" style={{ margin: 0 }}>{subtitle}</p>}
    </section>
  );
}
