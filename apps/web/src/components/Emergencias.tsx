"use client";

// Pestaña Emergencias: tu ubicación (se comparte al llamar), avisar a tus contactos, tu clínica y los números de Chile.
// Los números 131 a 134 son reales; la clínica, su número y la dirección son de ejemplo.
import { useState } from "react";
import { Icon } from "@puente/ui";
import { cambiarPreferencias, usePreferencias } from "@/lib/preferencias";
import { SAMU, URGENCIAS, type Destino } from "@/lib/contactos";
import { MiniMapa } from "./Ilustraciones";
import { PERFIL } from "./MenuPerfil";

const NUMEROS: { numero: string; nombre: string; detalle: string; destino?: Destino }[] = [
  { numero: "131", nombre: "SAMU", detalle: "Ambulancia", destino: SAMU },
  { numero: "132", nombre: "Bomberos", detalle: "Incendios y rescates" },
  { numero: "133", nombre: "Carabineros", detalle: "Emergencias policiales" },
  { numero: "134", nombre: "PDI", detalle: "Policía de Investigaciones" },
];

export function Emergencias({ onLlamar, onAbrirPerfil }: { onLlamar: (d: Destino) => void; onAbrirPerfil: () => void }) {
  const p = usePreferencias();
  return (
    <div className="seccion">
      <h1 className="titulo-seccion">Emergencias</h1>

      <section className="ubicacion" aria-label="Tu ubicación">
        <div className="ubicacion-mapa">
          <MiniMapa />
        </div>
        <div className="ubicacion-info">
          <span className="ubicacion-pin" aria-hidden>
            <Icon name="ubicacion" size={18} />
          </span>
          <span className="row-txt">
            <strong>{PERFIL.direccion}</strong>
            <span>{p.compartirUbicacion ? "Se comparte al llamar" : "No se comparte al llamar"}</span>
          </span>
          <button
            type="button"
            className={p.compartirUbicacion ? "chip-toggle on" : "chip-toggle"}
            aria-pressed={p.compartirUbicacion}
            onClick={() => cambiarPreferencias({ compartirUbicacion: !p.compartirUbicacion })}
          >
            {p.compartirUbicacion ? "Compartiendo" : "Compartir"}
          </button>
        </div>
      </section>

      <article className="tu-clinica urgente">
        <div className="tu-clinica-fila">
          <span className="tu-clinica-logo tono-5" aria-hidden>
            <Icon name="emergencia" size={26} />
          </span>
          <span className="row-txt">
            <strong>Pedir una ambulancia</strong>
            <span>{URGENCIAS.nombre} · 24 h</span>
          </span>
        </div>
        <button type="button" className="btn-rojo" onClick={() => onLlamar(URGENCIAS)}>
          <Icon name="llamar" size={20} /> Llamar con Puente
        </button>
      </article>

      <AvisoContactos onAbrirPerfil={onAbrirPerfil} />

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

/** Aviso por mensaje a los contactos de emergencia, con la ubicación. TODO(real-data): enviar SMS/WhatsApp desde el backend. */
function AvisoContactos({ onAbrirPerfil }: { onAbrirPerfil: () => void }) {
  const { contactos } = usePreferencias();
  const [enviado, setEnviado] = useState(false);
  const mensaje = `${PERFIL.nombre} necesita ayuda. Está en ${PERFIL.direccion}. Te escribe desde Puente.`;

  return (
    <section aria-labelledby="t-avisar" className="avisar">
      <div className="avisar-cabeza">
        <span className="avisar-ico" aria-hidden>
          <Icon name="enviar" size={20} />
        </span>
        <span className="row-txt">
          <strong id="t-avisar">Avisar a mis contactos</strong>
          <span>{contactos.length ? "Les llega un mensaje con tu ubicación" : "Todavía no tienes contactos de emergencia"}</span>
        </span>
      </div>
      {contactos.length > 0 ? (
        <>
          <ul className="avisar-contactos">
            {contactos.map((c) => (
              <li key={c.id}>
                <span className="inicial" aria-hidden>
                  {c.nombre.charAt(0)}
                </span>
                <span>{c.nombre.split(" ")[0]}</span>
                {enviado && (
                  <span className="avisar-ok" aria-label="enviado">
                    <Icon name="listo" size={14} />
                  </span>
                )}
              </li>
            ))}
          </ul>
          {enviado ? (
            <div className="avisar-enviado" role="status">
              <p>
                <strong>Mensaje enviado</strong> (simulado en la demo):
              </p>
              <p className="avisar-mensaje">“{mensaje}”</p>
              <button type="button" className="enlace" onClick={() => setEnviado(false)}>
                Enviar otro aviso
              </button>
            </div>
          ) : (
            <button type="button" className="btn-negro" onClick={() => setEnviado(true)}>
              Enviar aviso a {contactos.length === 1 ? "1 contacto" : `${contactos.length} contactos`}
            </button>
          )}
        </>
      ) : (
        <button type="button" className="btn-negro" onClick={onAbrirPerfil}>
          Agregar contactos en mi perfil
        </button>
      )}
    </section>
  );
}
