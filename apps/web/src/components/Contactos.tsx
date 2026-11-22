"use client";

// Pestaña Contactos: buscar y llamar con Puente. Frecuentes (instituciones) y tus contactos de emergencia (personas).
// TODO(real-data): contactos del usuario (agenda) y números reales.
import { useState } from "react";
import { Icon } from "@puente/ui";
import { usePreferencias } from "@/lib/preferencias";
import { FRECUENTES, type Destino } from "@/lib/contactos";
import { FRASE_INICIAL } from "@/lib/mockCall";

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function Contactos({ onLlamar, onAbrirPerfil }: { onLlamar: (d: Destino) => void; onAbrirPerfil: () => void }) {
  const { contactos } = usePreferencias();
  const [q, setQ] = useState("");
  const coincide = (t: string) => sinTildes(t).includes(sinTildes(q.trim()));

  const personas: Destino[] = contactos.map((c, i) => ({
    id: c.id,
    nombre: c.nombre,
    corto: c.nombre.split(" ")[0] ?? c.nombre,
    motivo: `${c.relacion} · ${c.telefono}`,
    sigla: c.nombre.charAt(0),
    tono: i % 5,
    guion: "general",
    frasesIniciales: [FRASE_INICIAL.general],
  }));
  const instituciones = FRECUENTES.filter((c) => coincide(c.nombre) || coincide(c.motivo));
  const gente = personas.filter((c) => coincide(c.nombre) || coincide(c.motivo));

  return (
    <div className="seccion">
      <h1 className="titulo-seccion">Contactos</h1>
      <label className="buscador">
        <span className="pu-sr">Buscar contacto</span>
        <Icon name="buscar" size={18} />
        <input type="search" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      <h2 className="seccion-sub">Instituciones</h2>
      <Lista items={instituciones} onLlamar={onLlamar} vacio="Ninguna coincide con tu búsqueda." />

      <div className="bloque-cabeza">
        <h2 className="seccion-sub">Personas</h2>
        <button type="button" className="enlace" onClick={onAbrirPerfil}>
          Editar
        </button>
      </div>
      <Lista items={gente} onLlamar={onLlamar} vacio="Agrega contactos en tu perfil." />
    </div>
  );
}

function Lista({ items, onLlamar, vacio }: { items: Destino[]; onLlamar: (d: Destino) => void; vacio: string }) {
  if (!items.length) return <p className="nota">{vacio}</p>;
  return (
    <ul className="group">
      {items.map((c) => (
        <li key={c.id} className="num">
          <span className={`num-badge tono-${c.tono}`} aria-hidden>
            {c.sigla}
          </span>
          <span className="row-txt">
            <strong>{c.nombre}</strong>
            <span>{c.motivo}</span>
          </span>
          <button type="button" className="num-llamar" onClick={() => onLlamar(c)} aria-label={`Llamar a ${c.nombre} con Puente`}>
            <Icon name="llamar" size={18} /> Llamar
          </button>
        </li>
      ))}
    </ul>
  );
}
