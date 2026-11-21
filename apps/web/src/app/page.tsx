"use client";

import { useState } from "react";
import { Button, CallStatus, Logo, Subtitles, VisualAlert, type CallState, type SubtitleLine } from "@puente/ui";
import { glossDictionary } from "@puente/glosses";
import { joinCall, type CallHandle } from "@/lib/call";

export default function Home() {
  const [call, setCall] = useState<CallHandle | null>(null);
  const [state, setState] = useState<CallState>("idle");
  const [lines, setLines] = useState<SubtitleLine[]>([]);
  const [alert, setAlert] = useState<string | null>(null);

  async function start() {
    setState("connecting");
    try {
      const handle = await joinCall({
        onMessage: (msg) => {
          if (msg.tipo === "ejecutivo_dice") {
            setLines((l) => [...l, { id: crypto.randomUUID(), who: "ejecutivo", text: msg.simple ?? msg.texto, original: msg.texto }]);
          } else if (msg.tipo === "estado") {
            const live = msg.valor === "llamada_iniciada";
            setState(live ? "live" : "ended");
            setAlert(live ? "Llamada conectada" : "Llamada terminada");
          }
        },
      });
      setCall(handle);
    } catch (e) {
      setState("idle");
      setAlert(`No se pudo conectar: ${(e as Error).message}`);
    }
  }

  return (
    <main>
      <header className="app">
        <Logo size={44} />
        <CallStatus state={state} />
      </header>
      <VisualAlert message={alert} tone={alert?.startsWith("No se pudo") ? "error" : "notice"} />
      {call ? (
        <Button size="lg" variant="danger" icon="colgar" onClick={() => { call.leave(); setCall(null); setState("ended"); }}>
          Colgar
        </Button>
      ) : (
        <Button size="lg" icon="llamar" onClick={start}>
          Llamar
        </Button>
      )}
      <Subtitles lines={lines} showOriginal />
      <p style={{ color: "var(--muted)", margin: 0 }}>
        Vocabulario LSCh cargado: {glossDictionary.glosses.length} señas (v{glossDictionary.version}).
      </p>
    </main>
  );
}
