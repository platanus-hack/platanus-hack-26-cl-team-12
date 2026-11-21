"use client";

// Pantalla de llamada (D2 + D3): subtítulos de lo que dice el ejecutivo, avisos visuales,
// y donde el cliente escribe o toca una respuesta rápida para que Puente lo diga por teléfono.
import { useEffect, useRef, useState } from "react";
import {
  Button, CallStatus, Composer, IncomingCall, Logo, QuickReplies, SignAvatar, Subtitles, VisualAlert,
  type AlertTone, type CallState, type SubtitleLine,
} from "@puente/ui";
import type { MensajePuente } from "@puente/glosses";
import { joinCall, type CallHandle } from "@/lib/call";
import { joinMockCall } from "@/lib/mockCall";
import { DESTINOS, Inicio, type Destino } from "./Inicio";

const AVATAR_MS_POR_SENA = 1300;
const MOCK_TIMBRE_MS = 3000; // en ?mock=1, la clínica "llama" a los 3 s de abrir la app // igual que el reproductor de fotos de lab/v4_avatar

const hora = () => new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

export function CallPanel({ mock }: { mock: boolean }) {
  const [call, setCall] = useState<CallHandle | null>(null);
  const [state, setState] = useState<CallState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [lines, setLines] = useState<SubtitleLine[]>([]);
  const [alert, setAlert] = useState<{ message: string; tone: AlertTone } | null>(null);
  const [senas, setSenas] = useState<{ glosas: string[]; subtitulo: string; actual: number } | null>(null);
  const [destino, setDestino] = useState<Destino | null>(null);
  const [entrante, setEntrante] = useState<Destino | null>(null);
  const callRef = useRef<CallHandle | null>(null);

  // Contador de duración mientras la llamada está en curso.
  useEffect(() => {
    if (state !== "live") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  // El avatar avanza una seña cada AVATAR_MS_POR_SENA. TODO(v4): reemplazar por ClipSignPlayer.
  useEffect(() => {
    if (!senas || senas.actual >= senas.glosas.length) return;
    const id = setTimeout(() => setSenas((s) => (s ? { ...s, actual: s.actual + 1 } : s)), AVATAR_MS_POR_SENA);
    return () => clearTimeout(id);
  }, [senas]);

  // Versión 1: la clínica te llama. En ?mock=1 se simula una llamada entrante al abrir la app.
  // TODO(v1): en producción llega como notificación push / evento `call.incoming` desde services/api.
  useEffect(() => {
    if (!mock) return;
    const clinica = DESTINOS[0];
    if (!clinica) return;
    const id = setTimeout(() => {
      setEntrante(clinica);
      setState((s) => (s === "idle" ? "ringing" : s)); // si ya estás en otra llamada, no interrumpe
    }, MOCK_TIMBRE_MS);
    return () => clearTimeout(id);
  }, [mock]);

  // Cortar la conexión si el usuario cierra la pantalla en medio de una llamada.
  useEffect(() => () => callRef.current?.leave(), []);

  function onMessage(msg: MensajePuente) {
    switch (msg.tipo) {
      case "ejecutivo_dice":
        setLines((l) => [...l, { id: crypto.randomUUID(), who: "ejecutivo", time: hora(), text: msg.simple ?? msg.texto, original: msg.texto }]);
        break;
      case "estado":
        if (msg.valor === "llamada_iniciada") {
          setState("live"); // CallStatus ya muestra "En llamada" + duración; no hace falta otro aviso.
          setAlert(null);
        } else {
          setState("ended");
          setAlert({ message: "La llamada terminó", tone: "quiet" });
          callRef.current?.leave();
          callRef.current = null;
          setCall(null);
        }
        break;
      case "glosas_para_senar":
        setSenas({ glosas: msg.glosas, subtitulo: msg.subtitulo, actual: 0 });
        break;
    }
  }

  async function llamar(d: Destino, esEntrante = false) {
    setDestino(d);
    setEntrante(null);
    setLines([]);
    setSenas(null);
    setSeconds(0);
    setAlert(null);
    setState("connecting");
    try {
      // TODO(v1): en una llamada entrante real, unirse a la sala `call-*` que creó la dispatch rule.
      const handle = mock ? await joinMockCall({ onMessage, entrante: esEntrante }) : await joinCall({ onMessage });
      callRef.current = handle;
      setCall(handle);
    } catch (e) {
      setState("idle");
      setAlert({ message: `No se pudo conectar (${(e as Error).message}). Revisa tu internet y toca Llamar otra vez.`, tone: "error" });
    }
  }

  function colgar() {
    callRef.current?.leave();
    callRef.current = null;
    setCall(null);
    setState("ended");
    setAlert({ message: "Colgaste la llamada", tone: "quiet" });
  }

  function rechazar() {
    setEntrante(null);
    setState("idle");
    setAlert({ message: "Rechazaste la llamada", tone: "quiet" });
  }

  async function decir(texto: string) {
    if (!callRef.current) return;
    setLines((l) => [...l, { id: crypto.randomUUID(), who: "cliente", time: hora(), text: texto }]);
    try {
      await callRef.current.send({ tipo: "cliente_dice", texto });
    } catch {
      setAlert({ message: "No se pudo enviar tu mensaje. Inténtalo de nuevo.", tone: "error" });
    }
  }

  const enLlamada = state === "live";

  if (state === "ringing" && entrante) {
    return (
      <IncomingCall
        caller={entrante.nombre}
        detail="Te llama por Puente. Al contestar verás lo que dice en texto y señas."
        onAnswer={() => llamar(entrante, true)}
        onDecline={rechazar}
      />
    );
  }

  return (
    <main>
      <header className="app">
        <Logo size={40} />
        <CallStatus state={state} seconds={seconds} />
      </header>

      <VisualAlert message={alert?.message ?? null} tone={alert?.tone} />

      {(state === "connecting" || state === "live") && destino && (
        <h1 className="pu-type-title call-title">{destino.nombre}</h1>
      )}

      {state === "idle" || state === "ended" ? <Inicio onLlamar={llamar} /> : null}

      {senas && <SignAvatar glosses={senas.glosas} current={senas.actual} subtitle={senas.subtitulo} />}

      {lines.length > 0 && <Subtitles lines={lines} showOriginal otherName={destino?.corto ?? "Ejecutivo"} />}

      {call && (
        <>
          {enLlamada && (
            <Composer onSend={decir}>
              <QuickReplies onPick={decir} />
            </Composer>
          )}
          <Button size="lg" variant="danger" icon="colgar" block onClick={colgar}>
            Colgar
          </Button>
        </>
      )}
    </main>
  );
}
