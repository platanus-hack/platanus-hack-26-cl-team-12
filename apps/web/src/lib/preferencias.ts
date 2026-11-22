"use client";

// Preferencias de la persona (tema, intérprete, accesibilidad). Se guardan en este celular (localStorage).
// TODO(real-data): guardarlas en el perfil del usuario cuando exista inicio de sesión.
import { useEffect, useSyncExternalStore } from "react";
import { APARIENCIA_POR_DEFECTO, type Apariencia } from "@puente/ui";

export interface Contacto {
  id: string;
  nombre: string;
  relacion: string;
  telefono: string;
}

export interface Preferencias {
  tema: "oscuro" | "claro";
  interprete: "fotos" | "dibujado";
  velocidad: "lenta" | "normal" | "rapida";
  /** Intérprete dibujado hecho a la medida (menú > Personalizar intérprete). */
  avatar: Apariencia;
  /** Contactos de emergencia (se definen en Perfil). Reciben el aviso por mensaje. */
  contactos: Contacto[];
  /** Compartir la ubicación con la clínica al llamar (así no la preguntan). */
  compartirUbicacion: boolean;
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
  sesion: { usuario: "rafael" },
  // Contactos de ejemplo. TODO(real-data): los del usuario.
  contactos: [
    { id: "c1", nombre: "Ana Rencoret", relacion: "Hermana", telefono: "+56 9 0000 0001" },
    { id: "c2", nombre: "Jorge Pérez", relacion: "Amigo", telefono: "+56 9 0000 0002" },
  ],
  compartirUbicacion: true,
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
