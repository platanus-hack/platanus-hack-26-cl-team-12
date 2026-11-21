import { cx } from "./cx";

export interface SubtitleLine {
  id: string;
  who: "ejecutivo" | "cliente";
  /** Lo que se muestra (en v2, la versión simple). */
  text: string;
  /** Lo que dijo el ejecutivo antes de simplificar (v2). */
  original?: string;
  time?: string;
}

/** Subtítulos en vivo. `aria-live` hace que los lectores de pantalla anuncien cada línea nueva. */
export function Subtitles({ lines, showOriginal = false, otherName = "Ejecutivo" }: { lines: SubtitleLine[]; showOriginal?: boolean; otherName?: string }) {
  return (
    <ol aria-live="polite" aria-label="Subtítulos de la llamada" className="pu-subs">
      {lines.map((l, i) => (
        <li key={l.id} data-who={l.who} className={cx("pu-sub", i === lines.length - 1 && "last")}>
          <span className="who">
            {l.who === "cliente" ? "Tú" : otherName}
            {l.time ? ` · ${l.time}` : ""}
          </span>
          <span>{l.text}</span>
          {showOriginal && l.original && l.original !== l.text && <span className="orig">Dijo: {l.original}</span>}
        </li>
      ))}
    </ol>
  );
}
