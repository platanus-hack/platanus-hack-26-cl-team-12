"use client";

// Pantalla de llamada. Durante la llamada todo cabe en una pantalla, sin bajar:
//   arriba   a quién llamas, estado + duración y Colgar
//   avatar   siempre visible, con lo último que te dijeron encima
//   chat     la conversación completa (baja sola al último mensaje)
//   abajo    respuestas rápidas y caja para escribir, fijas
import { useEffect, useRef, useState } from "react";
import {
  Button, CallStatus, Composer, Logo, QuickReplies, SignAvatar, Subtitles, VisualAlert, DEFAULT_REPLIES,
  type AlertTone, type CallState, type SubtitleLine,
} from "@puente/ui";
import type { MensajePuente } from "@puente/glosses";
import { joinCall, type CallHandle } from "@/lib/call";
import { joinMockCall } from "@/lib/mockCall";
import { Inicio, type Destino } from "./Inicio";

const AVATAR_MS_POR_SENA = 1300; // igual que el reproductor de fotos de lab/v4_avatar

const hora = () => new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

export function CallPanel({ mock }: { mock: boolean }) {
  const [call, setCall] = useState<CallHandle | null>(null);
  const [state, setState] = useState<CallState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [lines, setLines] = useState<SubtitleLine[]>([]);
  const [opciones, setOpciones] = useState<string[]>(DEFAULT_REPLIES);
  const [alert, setAlert] = useState<{ message: string; tone: AlertTone } | null>(null);
  const [senas, setSenas] = useState<{ glosas: string[]; subtitulo: string; actual: number } | null>(null);
  const [destino, setDestino] = useState<Destino | null>(null);
  const callRef = useRef<CallHandle | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // Contador de duración mientras la llamada está en curso.
  useEffect(() => {
    if (state !== "live") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  // El avatar avanza una seña cada AVATAR_MS_POR_SENA. TODO(v4): reemplazar por ClipSignPlayer / fotos.
  useEffect(() => {
    if (!senas || senas.actual >= senas.glosas.length) return;
    const id = setTimeout(() => setSenas((s) => (s ? { ...s, actual: s.actual + 1 } : s)), AVATAR_MS_POR_SENA);
    return () => clearTimeout(id);
  }, [senas]);

  // El chat baja solo al último mensaje: nunca hay que bajar a mano para ver qué te dijeron.
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [lines]);

  // Cortar la conexión si el usuario cierra la pantalla en medio de una llamada.
  useEffect(() => () => callRef.current?.leave(), []);

  function onMessage(msg: MensajePuente) {
    switch (msg.tipo) {
      case "ejecutivo_dice":
        setLines((l) => [...l, { id: crypto.randomUUID(), who: "ejecutivo", time: hora(), text: msg.simple ?? msg.texto, original: msg.texto }]);
        setOpciones(msg.opciones?.length ? msg.opciones : DEFAULT_REPLIES);
        // Sin v4 activa no llega glosas_para_senar: el subtítulo del avatar igual muestra lo último que dijeron.
        setSenas((s) => ({ glosas: s?.glosas ?? [], actual: s?.actual ?? 0, subtitulo: msg.simple ?? msg.texto }));
        break;
      case "estado":
        if (msg.valor === "llamada_iniciada") {
          setState("live"); // CallStatus ya muestra "En llamada" + duración; no hace falta otro aviso.
          setAlert(null);
        } else {
          setState("ended");
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

  async function llamar(d: Destino) {
    setDestino(d);
    setLines([]);
    setSenas(null);
    setOpciones(DEFAULT_REPLIES);
    setSeconds(0);
    setAlert(null);
    setState("connecting");
    try {
      const handle = mock ? await joinMockCall({ onMessage }) : await joinCall({ onMessage });
      callRef.current = handle;
      setCall(handle);
    } catch (e) {
      setState("idle");
      setAlert({ message: `No se pudo conectar (${(e as Error).message}). Revisa tu internet y toca de nuevo.`, tone: "error" });
    }
  }

  function colgar() {
    callRef.current?.leave();
    callRef.current = null;
    setCall(null);
    setState("ended");
  }

  function volver() {
    setState("idle");
    setLines([]);
    setSenas(null);
    setDestino(null);
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

  // Inicio (antes de llamar).
  if (state === "idle") {
    return (
      <main>
        <header className="app">
          <Logo size={40} />
        </header>
        <VisualAlert message={alert?.message ?? null} tone={alert?.tone} />
        <Inicio onLlamar={llamar} />
      </main>
    );
  }

  // Llamada (conectando, en curso o terminada): una sola pantalla, sin bajar.
  const enLlamada = state === "live";
  const subtitulo = senas?.subtitulo ?? (state === "connecting" ? "Llamando…" : "Esperando que te hablen…");

  return (
    <main className="call">
      <header className="call-head">
        <div className="who">
          <strong>{destino?.nombre}</strong>
          <CallStatus state={state} seconds={seconds} />
        </div>
        {call && (
          <Button variant="danger" icon="colgar" onClick={colgar}>
            Colgar
          </Button>
        )}
      </header>

      <SignAvatar glosses={senas?.glosas ?? []} current={senas?.actual} subtitle={subtitulo} />

      <div className="chat" ref={chatRef}>
        {lines.length > 0 && <Subtitles lines={lines} showOriginal otherName={destino?.corto ?? "Ejecutivo"} />}
      </div>

      <VisualAlert message={alert?.message ?? null} tone={alert?.tone} />

      {enLlamada && (
        <Composer compact onSend={decir} placeholder="Escribe tu respuesta">
          <QuickReplies options={opciones} onPick={decir} />
        </Composer>
      )}
      {state === "ended" && (
        <Button size="lg" block onClick={volver}>
          Volver al inicio
        </Button>
      )}
    </main>
  );
}
