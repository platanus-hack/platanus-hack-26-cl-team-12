"use client";

// Pestaña central (estilo de apps de movilidad: tarjetas, títulos grandes, carruseles con puntitos).
//   1. Tu ubicación (se comparte con la clínica al llamar, así no la preguntan).
//   2. Pedir una ambulancia: 10 clínicas en carrusel (todas usan la misma llamada simulada en ?mock=1).
//   3. Avisar a mis contactos de emergencia (mensaje con la ubicación; simulado).
//   4. Consejos de salud (carrusel).
//   5. Cómo funciona.
import { useState } from "react";
import { Icon, type IconName } from "@puente/ui";
import { cambiarPreferencias, usePreferencias } from "@/lib/preferencias";
import { Carrusel } from "./Carrusel";
import { IlustracionDatos, IlustracionFractura, IlustracionQuemadura, MiniMapa } from "./Ilustraciones";
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

type Clinica = Destino & { sigla: string; comuna: string; tono: number };
const clinica = (id: string, sigla: string, nombre: string, comuna: string, tono: number): Clinica => ({
  id, sigla, nombre: `Urgencias ${nombre}`, corto: "Urgencias", motivo: "Pedir una ambulancia", comuna, tono, frasesIniciales: FRASES,
});

// TODO(real-data): números reales desde ALLOWED_DESTINATIONS en services/api. Hoy todas usan el mismo guion.
export const CLINICAS: Clinica[] = [
  clinica("santa-maria", "SM", "Clínica Santa María", "Providencia", 0),
  clinica("alemana", "CA", "Clínica Alemana", "Vitacura", 1),
  clinica("las-condes", "LC", "Clínica Las Condes", "Las Condes", 2),
  clinica("indisa", "IN", "Clínica Indisa", "Providencia", 3),
  clinica("davila", "DA", "Clínica Dávila", "Recoleta", 4),
  clinica("bupa", "BS", "Clínica Bupa Santiago", "La Florida", 0),
  clinica("uc-christus", "UC", "Clínica UC Christus", "Santiago", 1),
  clinica("tabancura", "TA", "Clínica Tabancura", "Vitacura", 2),
  clinica("vespucio", "VE", "Clínica Vespucio", "La Florida", 3),
  clinica("redsalud", "RS", "Clínica RedSalud Providencia", "Providencia", 4),
];

/** La clínica por defecto (atajo del ícono, "Tu clínica" en Emergencias). */
export const URGENCIAS: Clinica = CLINICAS[0]!;

// Consejos generales de primeros auxilios. No reemplazan la atención médica.
const CONSEJOS = [
  { Dibujo: IlustracionFractura, titulo: "Si crees que hay una fractura", texto: "No muevas la zona. Inmovilízala y pon frío envuelto en un paño mientras llega la ayuda." },
  { Dibujo: IlustracionQuemadura, titulo: "Quemaduras", texto: "Enfría con agua corriente, no helada, por 20 minutos. No uses hielo ni pasta de dientes." },
  { Dibujo: IlustracionDatos, titulo: "Ten tus datos a mano", texto: "Guarda tu dirección, tus contactos y tus datos médicos en tu perfil. Puente los usa en una urgencia." },
];

const PASOS: { icon: IconName; titulo: string; texto: string }[] = [
  { icon: "llamar", titulo: "Eliges a quién llamar", texto: "Puente llama por teléfono por ti y comparte tu ubicación." },
  { icon: "subtitulos", titulo: "Lees lo que te dicen", texto: "La voz se convierte en texto simple, y el intérprete lo muestra en lengua de señas." },
  { icon: "escribir", titulo: "Respondes con un toque", texto: "Toca una respuesta sugerida o escribe. Puente se lo dice con voz." },
  { icon: "senas", titulo: "Pronto: con señas", texto: "Podrás responder haciendo señas frente a la cámara." },
];

export function Inicio({ onLlamar, onAbrirPerfil }: { onLlamar: (d: Destino) => void; onAbrirPerfil: () => void }) {
  const p = usePreferencias();
  const nombre = PERFIL.nombre.split(" ")[0];
  return (
    <div className="seccion">
      <h1 className="titulo-seccion">Hola, {nombre}</h1>

      {/* 1. Ubicación */}
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
            <span>{p.compartirUbicacion ? "Se comparte con la clínica al llamar" : "No se comparte al llamar"}</span>
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

      {/* 2. Clínicas */}
      <section aria-labelledby="t-ambulancia" className="bloque-u">
        <div className="bloque-cabeza">
          <h2 id="t-ambulancia">Pedir una ambulancia</h2>
          <span className="pildora-24">24 h</span>
        </div>
        <Carrusel etiqueta="Clínicas" porPagina={3} className="carrusel-clinicas">
          {CLINICAS.map((c) => (
            <button key={c.id} type="button" className="clinica" onClick={() => onLlamar(c)} aria-label={`Llamar a ${c.nombre}`}>
              <span className={`clinica-tile tono-${c.tono}`}>
                <span className="clinica-sigla">{c.sigla}</span>
                <span className="clinica-fono" aria-hidden>
                  <Icon name="llamar" size={16} />
                </span>
              </span>
              <span className="clinica-nombre">{c.nombre.replace("Urgencias ", "")}</span>
              <span className="clinica-detalle">{c.comuna}</span>
            </button>
          ))}
        </Carrusel>
      </section>

      {/* 3. Avisar a contactos */}
      <AvisoContactos onAbrirPerfil={onAbrirPerfil} />

      {/* 4. Consejos */}
      <section aria-labelledby="t-consejos" className="bloque-u">
        <div className="bloque-cabeza">
          <h2 id="t-consejos">Consejos de salud</h2>
        </div>
        <Carrusel etiqueta="Consejos de salud" className="carrusel-consejos">
          {CONSEJOS.map(({ Dibujo, titulo, texto }) => (
            <article key={titulo} className="consejo">
              <span className="consejo-dibujo">
                <Dibujo />
              </span>
              <div className="consejo-txt">
                <strong>{titulo}</strong>
                <p>{texto}</p>
              </div>
            </article>
          ))}
        </Carrusel>
        <p className="nota">Consejos generales de primeros auxilios. No reemplazan la atención médica.</p>
      </section>

      {/* 5. Cómo funciona */}
      <section aria-labelledby="t-pasos" className="como">
        <h2 id="t-pasos">Cómo funciona</h2>
        <ol>
          {PASOS.map((paso, i) => (
            <li key={paso.titulo}>
              <span className="como-num" aria-hidden>
                {i + 1}
              </span>
              <span className="como-txt">
                <strong>{paso.titulo}</strong>
                <span>{paso.texto}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
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
