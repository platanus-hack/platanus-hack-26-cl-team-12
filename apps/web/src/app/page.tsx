"use client";

import { useEffect, useState } from "react";
import { CallPanel } from "@/components/CallPanel";
import { useServiceWorker } from "@/components/AppInstalable";
import { useAplicarPreferencias } from "@/lib/preferencias";

// Inicio: la pantalla de llamada.
//   ?mock=1             la llamada es simulada (no necesita backend). La app instalada abre así (manifest).
//   ?llamar=urgencias   llama altiro (atajo "Pedir una ambulancia" al mantener presionado el ícono en Android).
export default function Home() {
  useServiceWorker();
  useAplicarPreferencias();
  const [opts, setOpts] = useState<{ mock: boolean; autoLlamar: boolean } | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setOpts({ mock: q.get("mock") === "1", autoLlamar: q.get("llamar") === "urgencias" });
  }, []);
  if (!opts) return null;
  return <CallPanel mock={opts.mock} autoLlamar={opts.autoLlamar} />;
}
