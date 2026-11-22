"use client";

// Pestaña central (estilo de apps de movilidad: tarjetas grises, títulos grandes, carrusel horizontal).
//   1. Pedir una ambulancia: tres clínicas (todas usan la misma llamada simulada en ?mock=1).
//   2. Consejos de salud (carrusel).
//   3. Cómo funciona, en chico.
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

const FRASES = ["Hola, necesito una ambulancia. Mi hijo se cayó y se quebró el codo."];

// TODO(real-data): números reales desde ALLOWED_DESTINATIONS en services/api. Hoy las tres usan el mismo guion.
export const CLINICAS: (Destino & { sigla: string; detalle: string })[] = [
  { id: "santa-maria", sigla: "SM", nombre: "Urgencias Clínica Santa María", corto: "Urgencias", motivo: "Pedir una ambulancia", detalle: "Providencia", frasesIniciales: FRASES },
  { id: "alemana", sigla: "CA", nombre: "Urgencias Clínica Alemana", corto: "Urgencias", motivo: "Pedir una ambulancia", detalle: "Vitacura", frasesIniciales: FRASES },
  { id: "las-condes", sigla: "LC", nombre: "Urgencias Clínica Las Condes", corto: "Urgencias", motivo: "Pedir una ambulancia", detalle: "Las Condes", frasesIniciales: FRASES },
];

/** La clínica por defecto (atajo del ícono, Emergencias). */
export const URGENCIAS: Destino = CLINICAS[0]!;

// Consejos generales de primeros auxilios. No reemplazan la atención médica.
const CONSEJOS: { icon: IconName; titulo: string; texto: string; tono: string }[] = [
  { icon: "emergencia", titulo: "Si crees que hay una fractura", texto: "No muevas la zona. Inmovilízala y pon frío envuelto en un paño mientras llega la ayuda.", tono: "t1" },
  { icon: "aviso", titulo: "Quemaduras", texto: "Enfría con agua corriente, no helada, por 20 minutos. No uses hielo ni pasta de dientes.", tono: "t2" },
  { icon: "avatar", titulo: "Ten tus datos a mano", texto: "Guarda tu dirección y tus datos médicos en tu perfil. Puente los usa en una urgencia.", tono: "t3" },
];

const PASOS: { icon: IconName; texto: string }[] = [
  { icon: "llamar", texto: "Puente llama por ti" },
  { icon: "subtitulos", texto: "Lees en texto y señas" },
  { icon: "escribir", texto: "Respondes con un toque" },
];

export function Inicio({ onLlamar }: { onLlamar: (d: Destino) => void }) {
  const nombre = PERFIL.nombre.split(" ")[0];
  return (
    <div className="seccion">
      <h1 className="titulo-seccion">Hola, {nombre}</h1>

      <section aria-labelledby="t-ambulancia" className="bloque-u">
        <div className="bloque-cabeza">
          <h2 id="t-ambulancia">Pedir una ambulancia</h2>
          <span className="pildora-24">24 h</span>
        </div>
        <ul className="clinicas">
          {CLINICAS.map((c) => (
            <li key={c.id}>
              <button type="button" className="clinica" onClick={() => onLlamar(c)} aria-label={`Llamar a ${c.nombre}`}>
                <span className="clinica-tile">
                  <span className="clinica-sigla">{c.sigla}</span>
                  <span className="clinica-fono" aria-hidden>
                    <Icon name="llamar" size={16} />
                  </span>
                </span>
                <span className="clinica-nombre">{c.nombre.replace("Urgencias ", "")}</span>
                <span className="clinica-detalle">{c.detalle}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="t-consejos" className="bloque-u">
        <div className="bloque-cabeza">
          <h2 id="t-consejos">Consejos de salud</h2>
        </div>
        <ul className="carrusel">
          {CONSEJOS.map((c) => (
            <li key={c.titulo} className={`consejo ${c.tono}`}>
              <div className="consejo-txt">
                <strong>{c.titulo}</strong>
                <p>{c.texto}</p>
              </div>
              <span className="consejo-ico" aria-hidden>
                <Icon name={c.icon} size={28} />
              </span>
            </li>
          ))}
        </ul>
        <p className="nota">Consejos generales de primeros auxilios. No reemplazan la atención médica.</p>
      </section>

      <section aria-labelledby="t-pasos" className="como">
        <h2 id="t-pasos">Cómo funciona</h2>
        <ol>
          {PASOS.map((p) => (
            <li key={p.texto}>
              <Icon name={p.icon} size={16} />
              <span>{p.texto}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
