"use client";

// Pantalla de llamada entrante (versión 1 del producto: la clínica llama a la persona sorda).
// Reemplaza el timbre por señales visuales (pulso, borde que destella) y vibración si el celular la tiene.
// Se contesta deslizando el botón hacia la izquierda; con teclado o lector de pantalla, activándolo.
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { cx } from "./cx";
import { Icon } from "./Icon";

export interface IncomingCallProps {
  /** Quién llama, como lo verá el usuario: "Clínica Santa María". */
  caller: string;
  /** Línea secundaria: "Te llama para confirmar tu hora". */
  detail?: string;
  onAnswer: () => void;
  onDecline: () => void;
}

const UMBRAL = 0.6; // fracción del recorrido para contestar
const VIBRACION = [600, 400, 600, 1200]; // patrón tipo timbre

export function IncomingCall({ caller, detail = "Llamada entrante por Puente", onAnswer, onDecline }: IncomingCallProps) {
  const track = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const moved = useRef(false); // si arrastró, el click que sigue no cuenta como toque
  const [dx, setDx] = useState(0); // desplazamiento hacia la izquierda, en px (≤ 0)
  const [max, setMax] = useState(1);

  // Vibrar mientras suena (Android). iOS no expone vibración a la web: queda solo lo visual.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    navigator.vibrate(VIBRACION);
    const id = setInterval(() => navigator.vibrate(VIBRACION), 2800);
    return () => {
      clearInterval(id);
      navigator.vibrate(0);
    };
  }, []);

  function down(e: PointerEvent<HTMLButtonElement>) {
    const t = track.current;
    if (!t) return;
    setMax(t.clientWidth - e.currentTarget.offsetWidth - 8);
    start.current = e.clientX;
    moved.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    if (start.current == null) return;
    const d = e.clientX - start.current;
    if (Math.abs(d) > 6) moved.current = true;
    setDx(Math.max(-max, Math.min(0, d)));
  }
  function up() {
    if (start.current == null) return;
    start.current = null;
    if (-dx >= max * UMBRAL) onAnswer();
    else setDx(0);
  }

  const progreso = Math.min(1, -dx / max);

  return (
    <section className="pu-incoming" role="alertdialog" aria-labelledby="pu-incoming-caller" aria-describedby="pu-incoming-detail">
      <div className="ring" aria-hidden>
        <span className="ico">
          <Icon name="llamar" size={44} />
        </span>
      </div>
      <p className="kicker">Llamada entrante</p>
      <h1 id="pu-incoming-caller" className="caller">{caller}</h1>
      <p id="pu-incoming-detail" className="detail">{detail}</p>

      <div className="actions">
        <div ref={track} className={cx("track", progreso > 0 && "dragging")}>
          <span className="hint" style={{ opacity: 1 - progreso }}>
            Desliza a la izquierda para contestar
          </span>
          <button
            type="button"
            className="thumb"
            style={{ transform: `translateX(${dx}px)` }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onClick={(e) => {
              // Con el dedo o el mouse hay que deslizar (evita contestar sin querer).
              // Teclado y lectores de pantalla activan el botón sin puntero (detail 0): ahí contesta directo.
              if (e.detail === 0 && !moved.current) onAnswer();
            }}
            aria-label={`Contestar llamada de ${caller}`}
          >
            <Icon name="llamar" size={30} />
          </button>
        </div>
        <button type="button" className="decline" onClick={onDecline}>
          <Icon name="colgar" size={22} /> Rechazar
        </button>
      </div>
    </section>
  );
}
