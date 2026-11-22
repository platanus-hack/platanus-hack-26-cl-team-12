"use client";

// Pantalla de inicio. Enfoque de la demo: pedir una ambulancia a urgencias de la clínica.
import { Icon, Logo, type IconName } from "@puente/ui";
import { BotonInstalar } from "./AppInstalable";

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

const TABS: { icon: IconName; label: string }[] = [
  { icon: "inicio", label: "Inicio" },
  { icon: "historial", label: "Historial" },
  { icon: "avatar", label: "Perfil" },
];

export function Inicio({ onLlamar }: { onLlamar: (d: Destino) => void }) {
  return (
    <div className="home">
      <header className="large-title">
        <Logo variant="mark" size={34} />
        <h1>Puente</h1>
        <BotonInstalar />
      </header>
      <p className="lede">Llamadas por teléfono, en texto y lengua de señas.</p>

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
            <li key={p.titulo}>
              <span className="row-ico" aria-hidden>
                <Icon name={p.icon} size={20} />
              </span>
              <span className="row-txt">
                <strong>{p.titulo}</strong>
                <span>{p.texto}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* TODO(real-data): Historial y Perfil (frases guardadas, dirección, datos médicos) todavía no existen. */}
      <nav className="tabbar" aria-label="Secciones">
        {TABS.map((t, i) => (
          <button key={t.label} type="button" className={i === 0 ? "tab on" : "tab"} aria-current={i === 0 ? "page" : undefined} aria-disabled={i !== 0 || undefined}>
            <Icon name={t.icon} size={24} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
