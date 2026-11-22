"use client";

// Estructura de la app fuera de una llamada:
//   arriba a la izquierda   foto de perfil (abre el menú, que sale desde la izquierda)
//   arriba al centro        logo
//   arriba a la derecha     "Instalar app" (si Android lo permite) y botón de tema claro/oscuro
//   abajo                   Historial · Inicio (centro) · Emergencias
import { useCallback, useState, type ReactNode } from "react";
import { Icon, Logo, type IconName } from "@puente/ui";
import { cambiarPreferencias, usePreferencias } from "@/lib/preferencias";
import { BotonInstalar } from "./AppInstalable";
import { Emergencias } from "./Emergencias";
import { Historial } from "./Historial";
import { Inicio, type Destino } from "./Inicio";
import { FotoPerfil, MenuPerfil } from "./MenuPerfil";

type Pestana = "historial" | "llamar" | "emergencias";
const PESTANAS: { id: Pestana; icon: IconName; label: string }[] = [
  { id: "historial", icon: "historial", label: "Historial" },
  { id: "llamar", icon: "inicio", label: "Inicio" }, // no dice "Llamar": tocarlo no llama, solo vuelve al inicio
  { id: "emergencias", icon: "emergencia", label: "Emergencias" },
];

export function AppShell({ onLlamar, aviso }: { onLlamar: (d: Destino) => void; aviso?: ReactNode }) {
  const [pestana, setPestana] = useState<Pestana>("llamar");
  const [menu, setMenu] = useState(false);
  const [vistaMenu, setVistaMenu] = useState<"menu" | "perfil">("menu");
  const cerrarMenu = useCallback(() => setMenu(false), []);
  const { tema } = usePreferencias();
  const oscuro = tema === "oscuro";

  return (
    <>
      <header className="barra">
        <div className="barra-izq">
          <button type="button" className="perfil-btn" onClick={() => {
              setVistaMenu("menu");
              setMenu(true);
            }}
            aria-label="Abrir menú de perfil" aria-expanded={menu}>
            <FotoPerfil size={38} />
          </button>
        </div>
        <Logo size={26} />
        <div className="barra-der">
          <BotonInstalar />
          <button
            type="button"
            className="icono-btn"
            onClick={() => cambiarPreferencias({ tema: oscuro ? "claro" : "oscuro" })}
            aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            <Icon name={oscuro ? "sol" : "luna"} size={22} />
          </button>
        </div>
      </header>

      <main className="contenido">
        {aviso}
        {pestana === "llamar" && (
          <Inicio
            onLlamar={onLlamar}
            onAbrirPerfil={() => {
              setVistaMenu("perfil");
              setMenu(true);
            }}
          />
        )}
        {pestana === "historial" && <Historial />}
        {pestana === "emergencias" && <Emergencias onLlamar={onLlamar} />}
      </main>

      <nav className="tabbar" aria-label="Secciones">
        {PESTANAS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab ${t.id === "llamar" ? "central" : ""} ${pestana === t.id ? "on" : ""}`}
            aria-current={pestana === t.id ? "page" : undefined}
            onClick={() => setPestana(t.id)}
          >
            <span className="tab-ico">
              <Icon name={t.icon} size={t.id === "llamar" ? 26 : 24} />
            </span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <MenuPerfil abierto={menu} onCerrar={cerrarMenu} vistaInicial={vistaMenu} />
    </>
  );
}
