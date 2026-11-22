"use client";

// Números de emergencia. Los de servicios públicos de Chile son reales; la clínica y su número son de ejemplo.
// Por ahora solo la ambulancia llama con Puente (es el escenario de la demo).
import { Icon } from "@puente/ui";
import { URGENCIAS, type Destino } from "./Inicio";

interface Numero {
  numero: string;
  nombre: string;
  detalle: string;
  destino?: Destino;
}

const SAMU: Destino = { id: "samu", nombre: "SAMU (ambulancia)", corto: "SAMU", motivo: "Pedir una ambulancia", frasesIniciales: URGENCIAS.frasesIniciales };

const NUMEROS: Numero[] = [
  { numero: "131", nombre: "SAMU", detalle: "Ambulancia", destino: SAMU },
  { numero: "132", nombre: "Bomberos", detalle: "Incendios y rescates" },
  { numero: "133", nombre: "Carabineros", detalle: "Emergencias policiales" },
  { numero: "134", nombre: "PDI", detalle: "Policía de Investigaciones" },
];

export function Emergencias({ onLlamar }: { onLlamar: (d: Destino) => void }) {
  return (
    <div className="seccion">
      <h1 className="titulo-seccion">Emergencias</h1>
      <p className="lede">Puente llama por ti y te muestra todo en texto y señas.</p>

      <h2 className="seccion-sub">Tu clínica</h2>
      <article className="tu-clinica">
        <div className="tu-clinica-fila">
          <span className={`tu-clinica-logo tono-${URGENCIAS.tono}`} aria-hidden>
            {URGENCIAS.sigla}
          </span>
          <span className="row-txt">
            <strong>{URGENCIAS.nombre.replace("Urgencias ", "")}</strong>
            <span>Urgencias 24 h · {URGENCIAS.comuna}</span>
            <span>+56 2 0000 0000 (ejemplo)</span>
          </span>
        </div>
        <button type="button" className="btn-negro" onClick={() => onLlamar(URGENCIAS)}>
          <Icon name="llamar" size={20} /> Llamar con Puente
        </button>
      </article>

      <h2 className="seccion-sub">Servicios de emergencia</h2>
      <ul className="group">
        {NUMEROS.map((n) => (
          <li key={n.numero} className="num">
            <span className="num-badge" aria-hidden>
              {n.numero}
            </span>
            <span className="row-txt">
              <strong>{n.nombre}</strong>
              <span>{n.detalle}</span>
            </span>
            {n.destino ? (
              <button type="button" className="num-llamar" onClick={() => onLlamar(n.destino!)} aria-label={`Llamar a ${n.nombre} con Puente`}>
                <Icon name="llamar" size={18} /> Llamar
              </button>
            ) : (
              <span className="chip-estado neutro">Pronto</span>
            )}
          </li>
        ))}
      </ul>
      <p className="nota">Si alguien a tu lado puede hablar, también puede llamar directo a estos números.</p>
    </div>
  );
}
