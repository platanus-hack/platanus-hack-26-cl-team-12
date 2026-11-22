"use client";

// Estructura de la app fuera de una llamada:
//   arriba a la izquierda   foto de perfil (abre el menú que sale desde la derecha) y botón de tema claro/oscuro
//   arriba a la derecha     logo y, si Android lo permite, "Instalar app"
//   abajo                   Historial · Llamar (centro) · Emergencias
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
  { id: "llamar", icon: "llamar", label: "Llamar" },
  { id: "emergencias", icon: "emergencia", label: "Emergencias" },
];

export function AppShell({ onLlamar, aviso }: { onLlamar: (d: Destino) => void; aviso?: ReactNode }) {
  const [pestana, setPestana] = useState<Pestana>("llamar");
  const [menu, setMenu] = useState(false);
  const cerrarMenu = useCallback(() => setMenu(false), []);
  const { tema } = usePreferencias();
  const oscuro = tema === "oscuro";

  return (
    <>
      <header className="barra">
        <div className="barra-izq">
          <button type="button" className="perfil-btn" onClick={() => setMenu(true)} aria-label="Abrir menú de perfil" aria-expanded={menu}>
            <FotoPerfil size={36} />
          </button>
          <button
            type="button"
            className="icono-btn"
            onClick={() => cambiarPreferencias({ tema: oscuro ? "claro" : "oscuro" })}
            aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            <Icon name={oscuro ? "sol" : "luna"} size={22} />
          </button>
        </div>
        <div className="barra-der">
          <BotonInstalar />
          <Logo variant="mark" size={30} />
        </div>
      </header>

      <main className="contenido">
        {aviso}
        {pestana === "llamar" && <Inicio onLlamar={onLlamar} />}
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

      <MenuPerfil abierto={menu} onCerrar={cerrarMenu} />
    </>
  );
}
