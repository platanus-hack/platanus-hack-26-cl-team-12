"use client";

// Pestaña Inicio. Puente es comunicación por teléfono para personas sordas en general (banco, salud, trámites).
//   0. Tu ubicación (chica) y Pedir una ambulancia, destacado en rojo (es lo más urgente).
//   1. Contactos frecuentes (carrusel con puntitos).
//   2. ¿Qué necesitas hacer? (acciones rápidas: ejecutivo del banco, hora médica, trámite, ambulancia).
//   3. Consejos para tus llamadas (carrusel).
//   4. Cómo funciona.
import { Icon, type IconName } from "@puente/ui";
import { ACCIONES, FRECUENTES, URGENCIAS, type Destino } from "@/lib/contactos";
import { cambiarPreferencias, usePreferencias } from "@/lib/preferencias";
import { Carrusel } from "./Carrusel";
import { IlustracionDatos, IlustracionDerechos, IlustracionRepetir } from "./Ilustraciones";
import { PERFIL } from "./MenuPerfil";

export type { Destino };

const CONSEJOS = [
  { Dibujo: IlustracionDatos, titulo: "Ten tus datos a mano", texto: "Antes de llamar, busca tu RUT, número de cliente o de atención. Te los van a pedir." },
  { Dibujo: IlustracionRepetir, titulo: "Pide que repitan", texto: "Si no entiendes, responde \"Repita, por favor\". Puente le pide a la persona que lo diga de nuevo." },
  { Dibujo: IlustracionDerechos, titulo: "Es tu derecho", texto: "La Ley 21.303 reconoce la Lengua de Señas Chilena como la lengua natural de las personas sordas." },
];

const PASOS: { icon: IconName; titulo: string; texto: string }[] = [
  { icon: "llamar", titulo: "Eliges a quién llamar", texto: "Tu banco, tu clínica, un servicio público o una persona. Puente llama por teléfono por ti." },
  { icon: "senas", titulo: "Ves sus señas y subtítulos", texto: "Un avatar te muestra en lengua de señas lo que dice la otra persona, con subtítulos simples." },
  { icon: "camara", titulo: "Respondes con señas", texto: "La cámara lee tus señas. Tocas Enviar y Puente lo dice con voz. También puedes escribir." },
];

export function Inicio({ onLlamar }: { onLlamar: (d: Destino) => void }) {
  const nombre = PERFIL.nombre.split(" ")[0];
  const p = usePreferencias();
  return (
    <div className="seccion">
      <h1 className="titulo-seccion">Hola, {nombre}</h1>

      {/* Ubicación, en chico: se comparte al pedir una ambulancia */}
      <button
        type="button"
        className="ubic-chica"
        aria-pressed={p.compartirUbicacion}
        onClick={() => cambiarPreferencias({ compartirUbicacion: !p.compartirUbicacion })}
      >
        <Icon name="ubicacion" size={16} />
        <span className="ubic-dir">{PERFIL.direccion}</span>
        <span className={p.compartirUbicacion ? "ubic-estado on" : "ubic-estado"}>{p.compartirUbicacion ? "Compartiendo" : "No compartida"}</span>
      </button>

      {/* Lo más urgente, en rojo */}
      <button type="button" className="sos" onClick={() => onLlamar(URGENCIAS)}>
        <span className="sos-ico" aria-hidden>
          <Icon name="emergencia" size={30} />
        </span>
        <span className="sos-txt">
          <strong>Pedir una ambulancia</strong>
          <span>{URGENCIAS.nombre} · comparte tu ubicación</span>
        </span>
      </button>

      <section aria-labelledby="t-frecuentes" className="bloque-u">
        <div className="bloque-cabeza">
          <h2 id="t-frecuentes">Contactos frecuentes</h2>
        </div>
        <Carrusel etiqueta="Contactos frecuentes" porPagina={3} className="carrusel-clinicas">
          {FRECUENTES.map((c) => (
            <button key={c.id} type="button" className="clinica" onClick={() => onLlamar(c)} aria-label={`Llamar a ${c.nombre}`}>
              <span className={`clinica-tile tono-${c.tono}`}>
                <span className="clinica-sigla">{c.sigla}</span>
                <span className="clinica-fono" aria-hidden>
                  <Icon name="llamar" size={16} />
                </span>
              </span>
              <span className="clinica-nombre">{c.nombre}</span>
              <span className="clinica-detalle">{c.motivo}</span>
            </button>
          ))}
        </Carrusel>
      </section>

      <section aria-labelledby="t-acciones" className="bloque-u">
        <div className="bloque-cabeza">
          <h2 id="t-acciones">¿Qué necesitas hacer?</h2>
        </div>
        <ul className="acciones">
          {ACCIONES.map((a) => (
            <li key={a.titulo}>
              <button type="button" className={`accion tono-${a.tono}`} onClick={() => onLlamar(a.destino)}>
                <span className="accion-ico" aria-hidden>
                  <Icon name={a.icon} size={22} />
                </span>
                <span className="accion-txt">
                  <strong>{a.titulo}</strong>
                  <span>{a.detalle}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="t-consejos" className="bloque-u">
        <div className="bloque-cabeza">
          <h2 id="t-consejos">Consejos para tus llamadas</h2>
        </div>
        <Carrusel etiqueta="Consejos" className="carrusel-consejos">
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
      </section>

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
