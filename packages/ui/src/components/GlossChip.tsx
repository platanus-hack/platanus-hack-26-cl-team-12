import { cx } from "./cx";

export type GlossState = "done" | "active" | "pending";

/** Una glosa LSCh en MAYÚSCULAS. `active` = la que se está señando ahora. */
export function GlossChip({ gloss, state = "done", confidence }: { gloss: string; state?: GlossState; confidence?: number }) {
  return (
    <span className={cx("pu-gloss", `pu-gloss-${state}`)}>
      {gloss}
      {confidence != null && <span className="c">{Math.round(confidence * 100)}%</span>}
    </span>
  );
}
