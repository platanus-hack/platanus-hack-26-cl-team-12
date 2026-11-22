"use client";

// Preferencias de la persona (tema, intérprete, accesibilidad). Se guardan en este celular (localStorage).
// TODO(real-data): guardarlas en el perfil del usuario cuando exista inicio de sesión.
import { useEffect, useSyncExternalStore } from "react";
import { APARIENCIA_POR_DEFECTO, type Apariencia } from "@puente/ui";

export interface Preferencias {
  tema: "oscuro" | "claro";
  interprete: "fotos" | "dibujado";
  velocidad: "lenta" | "normal" | "rapida";
  /** Intérprete dibujado hecho a la medida (menú > Personalizar intérprete). */
  avatar: Apariencia;
  /** Sesión iniciada (demo: cualquier usuario y contraseña). TODO(real-data): login real. */
  sesion: { usuario: string } | null;
  textoGrande: boolean;
  reducirMovimiento: boolean;
  vibrar: boolean;
  verOriginal: boolean;
}

import { CLAVE_PREFERENCIAS as CLAVE } from "./scriptTema";
const POR_DEFECTO: Preferencias = {
  tema: "oscuro",
  interprete: "fotos",
  velocidad: "normal",
  avatar: APARIENCIA_POR_DEFECTO,
  sesion: { usuario: "patricia" },
  textoGrande: false,
  reducirMovimiento: false,
  vibrar: true,
  verOriginal: true,
};

let actuales: Preferencias = POR_DEFECTO;
let cargadas = false;
const oyentes = new Set<() => void>();

function cargar(): Preferencias {
  if (!cargadas && typeof window !== "undefined") {
    cargadas = true;
    try {
      actuales = { ...POR_DEFECTO, ...JSON.parse(localStorage.getItem(CLAVE) ?? "{}") };
    } catch {
      actuales = POR_DEFECTO;
    }
  }
  return actuales;
}

export function cambiarPreferencias(cambio: Partial<Preferencias>) {
  actuales = { ...cargar(), ...cambio };
  try {
    localStorage.setItem(CLAVE, JSON.stringify(actuales));
  } catch {
    // Sin almacenamiento (modo incógnito): igual funciona mientras la app esté abierta.
  }
  oyentes.forEach((o) => o());
}

export function usePreferencias(): Preferencias {
  return useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    cargar,
    () => POR_DEFECTO,
  );
}

/** Aplica tema, tamaño de texto y movimiento al documento. Va una sola vez, arriba de todo. */
export function useAplicarPreferencias() {
  const p = usePreferencias();
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.theme = p.tema === "claro" ? "light" : "dark";
    html.dataset.texto = p.textoGrande ? "grande" : "normal";
    html.dataset.movimiento = p.reducirMovimiento ? "reducido" : "normal";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", p.tema === "claro" ? "#ffffff" : "#141414");
  }, [p.tema, p.textoGrande, p.reducirMovimiento]);
}
