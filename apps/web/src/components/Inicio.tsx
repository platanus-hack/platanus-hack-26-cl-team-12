"use client";

// Pestaña central: pedir ayuda. Enfoque de la demo: pedir una ambulancia a urgencias de la clínica.
import { Icon, type IconName } from "@puente/ui";
import { PERFIL } from "./MenuPerfil";

export interface Destino {
  id: string;
  nombre: string;
  corto: string; // cómo aparece en los subtítulos
  motivo: string;
  /** Lo primero que la persona puede decir con un toque apenas contestan (en una urgencia no hay tiempo de escribir). */
  frasesIniciales: string[];
}

// TODO(real-data): el número real sale de ALLOWED_DESTINATIONS en services/api.
export const URGENCIAS: Destino = {
  id: "urgencias",
  nombre: "Urgencias Clínica Santa María",
  corto: "Urgencias",
  motivo: "Pedir una ambulancia",
  // TODO(real-data): que la persona guarde sus propias frases (dirección, datos médicos) en su perfil.
  frasesIniciales: ["Hola, necesito una ambulancia. Mi hijo se cayó y se quebró el codo."],
};

const PASOS: { icon: IconName; titulo: string; texto: string }[] = [
  { icon: "llamar", titulo: "Puente llama por ti", texto: "Contesta una persona de urgencias" },
  { icon: "subtitulos", titulo: "Lees lo que te dicen", texto: "En texto simple y en lengua de señas" },
  { icon: "escribir", titulo: "Respondes con un toque", texto: "Puente se lo dice con voz" },
];

export function Inicio({ onLlamar }: { onLlamar: (d: Destino) => void }) {
  const nombre = PERFIL.nombre.split(" ")[0];
  return (
    <div className="seccion">
      <h1 className="titulo-seccion">Hola, {nombre}</h1>
      <p className="lede">¿Necesitas ayuda? Puente llama por ti.</p>

      <button type="button" className="sos" onClick={() => onLlamar(URGENCIAS)}>
        <span className="sos-ico" aria-hidden>
          <Icon name="llamar" size={30} />
        </span>
        <span className="sos-txt">
          <strong>{URGENCIAS.motivo}</strong>
          <span>{URGENCIAS.nombre}</span>
        </span>
      </button>

      <section aria-labelledby="t-pasos">
        <h2 id="t-pasos" className="group-title">Cómo funciona</h2>
        <ul className="group">
          {PASOS.map((p) => (
            <li key={p.titulo} className="fila">
              <span className="row-ico" aria-hidden>
                <Icon name={p.icon} size={18} />
              </span>
              <span className="row-txt">
                <strong>{p.titulo}</strong>
                <span>{p.texto}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
