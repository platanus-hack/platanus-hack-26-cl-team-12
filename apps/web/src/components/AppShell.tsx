"use client";

// Estructura de la app fuera de una llamada:
//   arriba a la izquierda   foto de perfil (abre el menú, que sale desde la izquierda)
//   arriba al centro        logo
//   arriba a la derecha     "Instalar app" (si Android lo permite) y botón de tema claro/oscuro
//   abajo                   Inicio · Contactos · Historial · Emergencias
import { useCallback, useState, type ReactNode } from "react";
import { Icon, Logo, type IconName } from "@puente/ui";
import { cambiarPreferencias, usePreferencias } from "@/lib/preferencias";
import { BotonInstalar } from "./AppInstalable";
import { Emergencias } from "./Emergencias";
import { Historial } from "./Historial";
import { Inicio } from "./Inicio";
import { Contactos } from "./Contactos";
import type { Destino } from "@/lib/contactos";
import { FotoPerfil, MenuPerfil } from "./MenuPerfil";

type Pestana = "inicio" | "contactos" | "historial" | "emergencias";
const PESTANAS: { id: Pestana; icon: IconName; label: string }[] = [
  { id: "inicio", icon: "inicio", label: "Inicio" },
  { id: "contactos", icon: "avatar", label: "Contactos" },
  { id: "historial", icon: "historial", label: "Historial" },
  { id: "emergencias", icon: "emergencia", label: "Emergencias" },
];

export function AppShell({ onLlamar, aviso }: { onLlamar: (d: Destino) => void; aviso?: ReactNode }) {
  const [pestana, setPestana] = useState<Pestana>("inicio");
  const [menu, setMenu] = useState(false);
  const [vistaMenu, setVistaMenu] = useState<"menu" | "perfil">("menu");
  const cerrarMenu = useCallback(() => setMenu(false), []);
  const abrirPerfil = () => {
    setVistaMenu("perfil");
    setMenu(true);
  };
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
        {pestana === "inicio" && <Inicio onLlamar={onLlamar} />}
        {pestana === "contactos" && <Contactos onLlamar={onLlamar} onAbrirPerfil={abrirPerfil} />}
        {pestana === "historial" && <Historial />}
        {pestana === "emergencias" && <Emergencias onLlamar={onLlamar} onAbrirPerfil={abrirPerfil} />}
      </main>

      <nav className="tabbar" aria-label="Secciones">
        {PESTANAS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={pestana === t.id ? "tab on" : "tab"}
            aria-current={pestana === t.id ? "page" : undefined}
            onClick={() => setPestana(t.id)}
          >
            <span className="tab-ico">
              <Icon name={t.icon} size={24} />
            </span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <MenuPerfil abierto={menu} onCerrar={cerrarMenu} vistaInicial={vistaMenu} />
    </>
  );
}
