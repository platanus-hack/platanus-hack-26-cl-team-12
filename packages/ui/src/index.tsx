// Componentes accesibles compartidos (WCAG 2.2 AA; avisos visuales en vez de sonoros).

export interface SubtitleLine {
  id: string;
  who: "ejecutivo" | "cliente";
  text: string;
}

/** Subtítulos en vivo. `aria-live` hace que los lectores de pantalla anuncien cada línea nueva. */
export function Subtitles({ lines }: { lines: SubtitleLine[] }) {
  return (
    <ol aria-live="polite" aria-label="Subtítulos de la llamada" className="puente-subtitles">
      {lines.map((l) => (
        <li key={l.id} data-who={l.who}>
          <strong>{l.who === "ejecutivo" ? "Ejecutivo" : "Tú"}:</strong> {l.text}
        </li>
      ))}
    </ol>
  );
}

/** Aviso visual grande (reemplaza tonos y timbres de llamada). */
export function VisualAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="puente-alert">
      {message}
    </div>
  );
}
