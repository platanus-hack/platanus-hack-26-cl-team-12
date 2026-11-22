"use client";

// D6: registra el service worker (la app funciona sin internet) y ofrece instalarla en el celular.
// Android (Chrome y Samsung Internet) avisa con `beforeinstallprompt` cuando la app se puede instalar:
// guardamos ese aviso y mostramos nuestro propio botón "Instalar".
import { useEffect, useState } from "react";
import { SENAS_BASE } from "@/lib/senas";

interface AvisoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Registra /sw.js solo en producción (en desarrollo guardaría copias viejas y confundiría). */
export function useServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    // El service worker no lee variables de entorno: se le pasa dónde están las fotos para guardarlas sin internet.
    navigator.serviceWorker.register(`/sw.js?senas=${encodeURIComponent(SENAS_BASE)}`).catch(() => {
      // Sin service worker la app funciona igual, solo que no sin internet.
    });
  }, []);
}

/** Botón para instalar la app. No se muestra si ya está instalada o si el navegador no lo permite. */
export function BotonInstalar() {
  const [aviso, setAviso] = useState<AvisoInstalacion | null>(null);

  useEffect(() => {
    const guardar = (e: Event) => {
      e.preventDefault(); // en vez de la barra del navegador, usamos nuestro botón
      setAviso(e as AvisoInstalacion);
    };
    const instalada = () => setAviso(null);
    window.addEventListener("beforeinstallprompt", guardar);
    window.addEventListener("appinstalled", instalada);
    return () => {
      window.removeEventListener("beforeinstallprompt", guardar);
      window.removeEventListener("appinstalled", instalada);
    };
  }, []);

  if (!aviso) return null;
  return (
    <button
      type="button"
      className="instalar"
      onClick={async () => {
        await aviso.prompt();
        await aviso.userChoice;
        setAviso(null);
      }}
    >
      Instalar app
    </button>
  );
}
