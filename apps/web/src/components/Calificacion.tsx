"use client";

// Al terminar la llamada: pantalla completa para calificar a Puente (el avatar, los subtítulos, la lectura de señas),
// no a la institución a la que llamaste.
// Estrellas grandes en el color del texto, etiquetas rápidas según la nota y comentario opcional.
// TODO(real-data): enviar la calificación al backend (hoy solo se muestra el agradecimiento).
import { useState } from "react";
import { Icon, Logo } from "@puente/ui";

const TEXTOS = ["Toca para calificar", "Muy mala", "Mala", "Regular", "Buena", "Excelente"];
const BIEN = ["El avatar se entendió", "Subtítulos claros", "Leyó bien mis señas", "Fue rápido", "Me entendieron bien"];
const MEJORAR = ["No entendí las señas", "Leyó mal mis señas", "Subtítulos difíciles", "Muy lento", "Se cortó"];

export function Calificacion({ quien, duracion, onListo }: { quien: string; sigla?: string; duracion: string; onListo: () => void }) {
  const [nota, setNota] = useState(0);
  const [etiquetas, setEtiquetas] = useState<string[]>([]);
  const [comentario, setComentario] = useState("");
  const [enviada, setEnviada] = useState(false);

  const opciones = nota >= 4 ? BIEN : MEJORAR;
  const alternar = (t: string) => setEtiquetas((e) => (e.includes(t) ? e.filter((x) => x !== t) : [...e, t]));

  return (
    <div className="calif" role="dialog" aria-modal="true" aria-labelledby="calif-titulo">
      <header className="calif-barra">
        <span />
        {!enviada && (
          <button type="button" className="calif-omitir" onClick={onListo}>
            Omitir
          </button>
        )}
      </header>

      {enviada ? (
        <div className="calif-cuerpo calif-fin" aria-live="polite">
          <span className="calif-check" aria-hidden>
            <Icon name="listo" size={34} />
          </span>
          <h1 id="calif-titulo">Gracias por tu opinión</h1>
          <p className="calif-sub">Nos ayuda a que Bridge funcione mejor para todas las personas sordas.</p>
        </div>
      ) : (
        <div className="calif-cuerpo">
          <span className="calif-logo" aria-hidden>
            <Logo variant="mark" size={34} />
          </span>
          <h1 id="calif-titulo">¿Cómo te fue con Bridge?</h1>
          <p className="calif-sub">
            Llamada con {quien} · {duracion}
          </p>

          <div className="calif-estrellas" role="radiogroup" aria-label="Calificación de la llamada">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={nota === n}
                aria-label={`${n} de 5: ${TEXTOS[n]}`}
                className={n <= nota ? "calif-estrella on" : "calif-estrella"}
                onClick={() => {
                  setNota(n);
                  setEtiquetas([]);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2 6.4 20.2l1.1-6.3L2.9 9.5l6.3-.9z" />
                </svg>
              </button>
            ))}
          </div>
          <p className="calif-nota">{TEXTOS[nota]}</p>

          {nota > 0 && (
            <>
              <p className="calif-pregunta">{nota >= 4 ? "¿Qué salió bien?" : "¿Qué podemos mejorar?"}</p>
              <div className="calif-chips">
                {opciones.map((t) => (
                  <button key={t} type="button" className={etiquetas.includes(t) ? "calif-chip on" : "calif-chip"} aria-pressed={etiquetas.includes(t)} onClick={() => alternar(t)}>
                    {t}
                  </button>
                ))}
              </div>
              <label htmlFor="calif-comentario" className="pu-sr">
                Comentario
              </label>
              <textarea id="calif-comentario" className="calif-comentario" rows={2} placeholder="Agrega un comentario (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)} />
            </>
          )}
        </div>
      )}

      <footer className="calif-pie">
        {enviada ? (
          <button type="button" className="btn-negro" onClick={onListo}>
            Volver al inicio
          </button>
        ) : (
          <button type="button" className="btn-negro" disabled={!nota} onClick={() => setEnviada(true)}>
            Enviar
          </button>
        )}
      </footer>
    </div>
  );
}
