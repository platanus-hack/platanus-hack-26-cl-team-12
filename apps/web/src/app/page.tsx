"use client";

import { useState } from "react";
import { Subtitles, VisualAlert, type SubtitleLine } from "@puente/ui";
import { glossDictionary } from "@puente/glosses";
import { joinCall, type CallHandle } from "@/lib/call";

export default function Home() {
  const [call, setCall] = useState<CallHandle | null>(null);
  const [lines, setLines] = useState<SubtitleLine[]>([]);
  const [alert, setAlert] = useState<string | null>(null);

  async function start() {
    try {
      const handle = await joinCall({
        onMessage: (msg) => {
          if (msg.tipo === "ejecutivo_dice") {
            setLines((l) => [...l, { id: crypto.randomUUID(), who: "ejecutivo", text: msg.simple ?? msg.texto }]);
          } else if (msg.tipo === "estado") {
            setAlert(msg.valor === "llamada_iniciada" ? "Llamada conectada" : "Llamada terminada");
          }
        },
      });
      setCall(handle);
    } catch (e) {
      setAlert(`No se pudo conectar: ${(e as Error).message}`);
    }
  }

  return (
    <main>
      <h1>Puente</h1>
      <VisualAlert message={alert} />
      {call ? (
        <button onClick={() => { call.leave(); setCall(null); }}>Colgar</button>
      ) : (
        <button onClick={start}>Iniciar llamada</button>
      )}
      <Subtitles lines={lines} />
      <p style={{ color: "var(--muted)" }}>
        Vocabulario LSCh cargado: {glossDictionary.glosses.length} señas (v{glossDictionary.version}).
      </p>
    </main>
  );
}
