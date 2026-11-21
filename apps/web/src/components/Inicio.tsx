"use client";

// Pantalla de inicio. Enfoque de la demo: pedir una ambulancia a urgencias de la clínica.
import { Icon, type IconName } from "@puente/ui";

export interface Destino {
  id: string;
  nombre: string;
  corto: string; // cómo aparece en los subtítulos
  motivo: string;
}

// TODO(real-data): el número real sale de ALLOWED_DESTINATIONS en services/api.
export const URGENCIAS: Destino = {
  id: "urgencias",
  nombre: "Urgencias Clínica Santa María",
  corto: "Urgencias",
  motivo: "Pedir una ambulancia",
};

const PASOS: { icon: IconName; titulo: string; texto: string }[] = [
  { icon: "llamar", titulo: "Puente llama por ti", texto: "Contesta una persona de urgencias, por teléfono." },
  { icon: "subtitulos", titulo: "Lees lo que te dicen", texto: "En texto simple y en lengua de señas, siempre arriba." },
  { icon: "escribir", titulo: "Respondes rápido", texto: "Toca una respuesta o escribe. Puente se lo dice con voz." },
];

export function Inicio({ onLlamar }: { onLlamar: (d: Destino) => void }) {
  return (
    <div className="inicio">
      <section className="hero">
        <h1 className="pu-type-display">Pide ayuda urgente sin necesidad de oír.</h1>
        <p>Puente llama a urgencias por ti y te muestra todo lo que te dicen.</p>
      </section>

      <button type="button" className="sos" onClick={() => onLlamar(URGENCIAS)}>
        <span className="sos-ico" aria-hidden>
          <Icon name="llamar" size={34} />
        </span>
        <span className="sos-txt">
          <strong>{URGENCIAS.motivo}</strong>
          <span>{URGENCIAS.nombre}</span>
        </span>
      </button>

      <section aria-labelledby="t-pasos" className="bloque">
        <h2 id="t-pasos" className="pu-type-title">Cómo funciona</h2>
        <ol className="pasos">
          {PASOS.map((p) => (
            <li key={p.titulo}>
              <span className="ico" aria-hidden>
                <Icon name={p.icon} size={24} />
              </span>
              <span className="txt">
                <strong>{p.titulo}</strong>
                <span>{p.texto}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
