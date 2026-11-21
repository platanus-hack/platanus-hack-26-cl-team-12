export const DEFAULT_REPLIES = ["Sí", "No", "Repita, por favor", "Más lento, por favor"];

/** Respuestas de un toque. Se envían altiro con `onPick(texto)`. */
export function QuickReplies({ options = DEFAULT_REPLIES, onPick, label = "Respuestas rápidas" }: { options?: string[]; onPick?: (text: string) => void; label?: string }) {
  return (
    <div className="pu-chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" className="pu-chip" onClick={() => onPick?.(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}
