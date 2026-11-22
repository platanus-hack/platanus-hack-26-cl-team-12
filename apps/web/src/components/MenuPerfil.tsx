"use client";

// Menú que sale desde la derecha al tocar la foto de perfil: 1 Perfil, 2 Intérprete de señas, 3 Accesibilidad, 4 Cerrar sesión.
// El perfil es de ejemplo. Las opciones del intérprete y de accesibilidad funcionan de verdad (lib/preferencias.ts).
// TODO(real-data): perfil real e inicio de sesión cuando exista backend con usuarios.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@puente/ui";
import { cambiarPreferencias, usePreferencias, type Preferencias } from "@/lib/preferencias";

export const PERFIL = {
  nombre: "Camila Rojas",
  iniciales: "CR",
  descripcion: "Persona sorda · Lengua de Señas Chilena",
  direccion: "Av. Providencia 1234, depto 56, Providencia",
  contacto: "Pedro Rojas (esposo) · +56 9 0000 0000",
  medicos: "Sin alergias conocidas",
};

type Vista = "menu" | "perfil" | "interprete" | "accesibilidad" | "salir";

export function FotoPerfil({ size = 36 }: { size?: number }) {
  return (
    <span className="foto" style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }} aria-hidden>
      {PERFIL.iniciales}
    </span>
  );
}

export function MenuPerfil({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const [vista, setVista] = useState<Vista>("menu");
  const [aviso, setAviso] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    setVista("menu");
    panel.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [abierto, onCerrar]);

  const titulos: Record<Vista, string> = {
    menu: "Menú",
    perfil: "Mi perfil",
    interprete: "Intérprete de señas",
    accesibilidad: "Accesibilidad",
    salir: "Cerrar sesión",
  };

  return (
    <div className={abierto ? "drawer abierto" : "drawer"} aria-hidden={!abierto}>
      <button type="button" className="drawer-fondo" tabIndex={-1} aria-label="Cerrar menú" onClick={onCerrar} />
      <div ref={panel} className="drawer-panel" role="dialog" aria-modal="true" aria-label={titulos[vista]} tabIndex={-1}>
        <header className="drawer-head">
          {vista !== "menu" ? (
            <button type="button" className="icono-btn" onClick={() => setVista("menu")} aria-label="Volver al menú">
              <span className="girar">
                <Icon name="derecha" size={22} />
              </span>
            </button>
          ) : (
            <span />
          )}
          <strong>{titulos[vista]}</strong>
          <button type="button" className="icono-btn" onClick={onCerrar} aria-label="Cerrar menú">
            <Icon name="cerrar" size={22} />
          </button>
        </header>

        <div className="drawer-cuerpo">
          {aviso && <p className="aviso-ok">{aviso}</p>}
          {vista === "menu" && (
            <>
              <button type="button" className="drawer-perfil" onClick={() => setVista("perfil")}>
                <FotoPerfil size={56} />
                <span className="row-txt">
                  <strong>{PERFIL.nombre}</strong>
                  <span>Ver y editar tu perfil</span>
                </span>
                <Icon name="derecha" size={20} />
              </button>
              <ul className="group">
                <Opcion icon="senas" texto="Personalizar intérprete de señas" onClick={() => setVista("interprete")} />
                <Opcion icon="accesibilidad" texto="Opciones de accesibilidad" onClick={() => setVista("accesibilidad")} />
                <Opcion icon="salir" texto="Cerrar sesión" peligro onClick={() => setVista("salir")} />
              </ul>
            </>
          )}

          {vista === "perfil" && (
            <>
              <div className="perfil-foto">
                <FotoPerfil size={96} />
                <button type="button" className="enlace" onClick={() => setAviso("Cambiar foto estará disponible pronto.")}>
                  Cambiar foto
                </button>
              </div>
              <ul className="group datos">
                <Dato titulo="Nombre" valor={PERFIL.nombre} />
                <Dato titulo="Cómo me comunico" valor={PERFIL.descripcion} />
                <Dato titulo="Dirección" valor={PERFIL.direccion} />
                <Dato titulo="Contacto de emergencia" valor={PERFIL.contacto} />
                <Dato titulo="Datos médicos" valor={PERFIL.medicos} />
              </ul>
              <p className="nota">Puente usa tu dirección para decirla rápido en una urgencia.</p>
            </>
          )}

          {vista === "interprete" && <Interprete />}
          {vista === "accesibilidad" && <Accesibilidad />}

          {vista === "salir" && (
            <div className="salir">
              <p>¿Quieres cerrar sesión en este celular? Tus preferencias se mantienen.</p>
              <button
                type="button"
                className="btn-peligro"
                onClick={() => {
                  setAviso("Cerraste sesión (simulado en la demo).");
                  setVista("menu");
                }}
              >
                Cerrar sesión
              </button>
              <button type="button" className="enlace" onClick={() => setVista("menu")}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Opcion({ icon, texto, onClick, peligro }: { icon: IconName; texto: string; onClick: () => void; peligro?: boolean }) {
  return (
    <li>
      <button type="button" className={peligro ? "opcion peligro" : "opcion"} onClick={onClick}>
        <span className="row-ico" aria-hidden>
          <Icon name={icon} size={18} />
        </span>
        <span className="opcion-txt">{texto}</span>
        {!peligro && <Icon name="derecha" size={18} />}
      </button>
    </li>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <li className="dato">
      <span>{titulo}</span>
      <strong>{valor}</strong>
    </li>
  );
}

function Grupo<T extends string>({ titulo, valor, opciones, onCambio }: { titulo: string; valor: T; opciones: { v: T; texto: ReactNode }[]; onCambio: (v: T) => void }) {
  return (
    <fieldset className="segmento">
      <legend>{titulo}</legend>
      <div className="segmento-ops">
        {opciones.map((o) => (
          <button key={o.v} type="button" className={o.v === valor ? "seg on" : "seg"} aria-pressed={o.v === valor} onClick={() => onCambio(o.v)}>
            {o.texto}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Interprete() {
  const p = usePreferencias();
  return (
    <div className="ajustes">
      <Grupo<Preferencias["interprete"]>
        titulo="Cómo ver las señas"
        valor={p.interprete}
        onCambio={(interprete) => cambiarPreferencias({ interprete })}
        opciones={[
          { v: "fotos", texto: "Fotos reales" },
          { v: "dibujado", texto: "Intérprete dibujado" },
        ]}
      />
      <Grupo<Preferencias["velocidad"]>
        titulo="Velocidad de las señas"
        valor={p.velocidad}
        onCambio={(velocidad) => cambiarPreferencias({ velocidad })}
        opciones={[
          { v: "lenta", texto: "Lenta" },
          { v: "normal", texto: "Normal" },
          { v: "rapida", texto: "Rápida" },
        ]}
      />
      <Grupo<Preferencias["piel"]>
        titulo="Tono de piel del intérprete dibujado"
        valor={p.piel}
        onCambio={(piel) => cambiarPreferencias({ piel })}
        opciones={[
          { v: "clara", texto: <span className="tono clara">Clara</span> },
          { v: "media", texto: <span className="tono media">Media</span> },
          { v: "oscura", texto: <span className="tono oscura">Oscura</span> },
        ]}
      />
      <p className="nota">Las fotos reales son del Diccionario de Lengua de Señas Chilena (UMCE). Si no están en este celular, se usa el intérprete dibujado.</p>
    </div>
  );
}

function Interruptor({ texto, detalle, valor, onCambio }: { texto: string; detalle: string; valor: boolean; onCambio: (v: boolean) => void }) {
  return (
    <li>
      <label className="interruptor">
        <span className="row-txt">
          <strong>{texto}</strong>
          <span>{detalle}</span>
        </span>
        <input type="checkbox" role="switch" checked={valor} onChange={(e) => onCambio(e.target.checked)} />
      </label>
    </li>
  );
}

function Accesibilidad() {
  const p = usePreferencias();
  return (
    <ul className="group">
      <Interruptor texto="Texto más grande" detalle="Agranda la letra de toda la app" valor={p.textoGrande} onCambio={(textoGrande) => cambiarPreferencias({ textoGrande })} />
      <Interruptor texto="Reducir movimiento" detalle="Sin animaciones ni parpadeos" valor={p.reducirMovimiento} onCambio={(reducirMovimiento) => cambiarPreferencias({ reducirMovimiento })} />
      <Interruptor texto="Ver lo que dijo exactamente" detalle="Muestra el texto original bajo la versión simple" valor={p.verOriginal} onCambio={(verOriginal) => cambiarPreferencias({ verOriginal })} />
      <Interruptor texto="Vibrar con los avisos" detalle="En Android, vibra cuando te hablan" valor={p.vibrar} onCambio={(vibrar) => cambiarPreferencias({ vibrar })} />
      <Interruptor texto="Modo claro" detalle="También con el botón de sol o luna arriba" valor={p.tema === "claro"} onCambio={(c) => cambiarPreferencias({ tema: c ? "claro" : "oscuro" })} />
    </ul>
  );
}
