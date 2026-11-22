"use client";

// Al terminar la llamada: calificación de 1 a 5 estrellas y comentario opcional.
// TODO(real-data): enviar la calificación al backend (hoy solo se muestra el agradecimiento).
import { useState } from "react";

const TEXTOS = ["", "Muy mala", "Mala", "Regular", "Buena", "Excelente"];

export function Calificacion({ quien, duracion, onListo }: { quien: string; duracion: string; onListo: () => void }) {
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviada, setEnviada] = useState(false);

  if (enviada) {
    return (
      <section className="califica" aria-live="polite">
        <p className="califica-gracias">¡Gracias por tu opinión!</p>
        <p className="nota centrada">Nos ayuda a mejorar Puente.</p>
        <button type="button" className="btn-principal" onClick={onListo}>
          Volver al inicio
        </button>
      </section>
    );
  }

  const visible = hover || nota;
  return (
    <section className="califica" aria-labelledby="califica-titulo">
      <h2 id="califica-titulo">¿Cómo estuvo la llamada?</h2>
      <p className="nota centrada">
        {quien} · {duracion}
      </p>
      <div className="estrellas" role="radiogroup" aria-label="Calificación de la llamada" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={nota === n}
            aria-label={`${n} de 5: ${TEXTOS[n]}`}
            className={n <= visible ? "estrella on" : "estrella"}
            onMouseEnter={() => setHover(n)}
            onClick={() => setNota(n)}
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2 6.4 20.2l1.1-6.3L2.9 9.5l6.3-.9z" />
            </svg>
          </button>
        ))}
      </div>
      <p className="califica-texto">{visible ? TEXTOS[visible] : "Toca una estrella"}</p>
      {nota > 0 && (
        <>
          <label htmlFor="califica-comentario" className="pu-sr">
            Comentario
          </label>
          <textarea id="califica-comentario" className="califica-comentario" rows={2} placeholder="Cuéntanos más (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)} />
        </>
      )}
      <button type="button" className="btn-principal" disabled={!nota} onClick={() => setEnviada(true)}>
        Enviar calificación
      </button>
      <button type="button" className="enlace" onClick={onListo}>
        Ahora no
      </button>
    </section>
  );
}
