"use client";

// Pantalla de inicio: qué es Puente, a quién llamar y cómo funciona.
import { Icon, type IconName } from "@puente/ui";

export interface Destino {
  id: string;
  nombre: string;
  corto: string; // cómo aparece en los subtítulos
  motivo: string;
  icon: IconName;
  disponible: boolean;
}

// Por ahora solo salud. TODO(real-data): la lista real sale de ALLOWED_DESTINATIONS en services/api.
export const DESTINOS: Destino[] = [
  { id: "clinica", nombre: "Clínica Santa María", corto: "Clínica", motivo: "Pedir una hora médica", icon: "llamar", disponible: true },
  { id: "cesfam", nombre: "CESFAM de tu comuna", corto: "CESFAM", motivo: "Horas y controles", icon: "llamar", disponible: false },
  { id: "fonasa", nombre: "Fonasa", corto: "Fonasa", motivo: "Bonos y consultas", icon: "llamar", disponible: false },
];

const PASOS: { icon: IconName; titulo: string; texto: string }[] = [
  { icon: "llamar", titulo: "Te llaman o llamas tú", texto: "Cuando la clínica te llame, Puente te avisa en pantalla. También puedes llamar tú." },
  { icon: "subtitulos", titulo: "Lees lo que te dicen", texto: "Su voz aparece como texto simple y en lengua de señas." },
  { icon: "escribir", titulo: "Respondes a tu manera", texto: "Escribe o haz señas. Puente se lo dice con voz." },
];

export function Inicio({ onLlamar }: { onLlamar: (d: Destino) => void }) {
  return (
    <div className="inicio">
      <section className="hero">
        <h1 className="pu-type-display">Llama a cualquier lugar sin necesidad de oír.</h1>
        <p>Puente convierte la llamada en texto y señas para ti, y en voz para quien atiende.</p>
      </section>

      <section aria-labelledby="t-destinos" className="bloque">
        <h2 id="t-destinos" className="pu-type-title">¿Quieres llamar tú?</h2>
        <ul className="destinos">
          {DESTINOS.map((d) => (
            <li key={d.id}>
              <button type="button" className="destino" disabled={!d.disponible} onClick={() => onLlamar(d)}>
                <span className="ico" aria-hidden>
                  <Icon name={d.icon} size={26} />
                </span>
                <span className="txt">
                  <strong>{d.nombre}</strong>
                  <span>{d.motivo}</span>
                </span>
                <span className="cta">{d.disponible ? "Llamar" : "Pronto"}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

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
