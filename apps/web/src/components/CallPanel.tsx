"use client";

// Pantalla de llamada. Durante la llamada todo cabe en una pantalla, sin bajar:
//   arriba   a quién llamas, estado + duración y Colgar
//   avatar   siempre visible, con lo último que te dijeron encima
//   chat     la conversación completa (baja sola al último mensaje)
//   abajo    respuestas rápidas y caja para escribir, fijas
import { useEffect, useRef, useState } from "react";
import {
  CallStatus, Composer, Icon, QuickReplies, SignAvatar, Subtitles, VisualAlert, DEFAULT_REPLIES, formatDuration,
  type AlertTone, type CallState, type SubtitleLine,
} from "@puente/ui";
import type { MensajePuente } from "@puente/glosses";
import { joinCall, type CallHandle } from "@/lib/call";
import { joinMockCall } from "@/lib/mockCall";
import { URGENCIAS, type Destino } from "./Inicio";
import { AppShell } from "./AppShell";
import { Calificacion } from "./Calificacion";
import { Login } from "./Login";
import { FotoPerfil } from "./MenuPerfil";
import { usePreferencias } from "@/lib/preferencias";
import { SenasFotos, useManifestSenas } from "./SenasFotos";

const AVATAR_MS_POR_SENA = 1300; // igual que el reproductor de fotos de lab/v4_avatar

const hora = () => new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

// Id local de cada línea de subtítulo. No se usa crypto.randomUUID: solo existe con HTTPS y falla al probar
// desde el celular por http://192.168.x.x:3000. (Aporte de Raimundo.)
let siguienteId = 0;
const nuevoId = () => `l${++siguienteId}`;


export function CallPanel({ mock, autoLlamar = false }: { mock: boolean; autoLlamar?: boolean }) {
  const [call, setCall] = useState<CallHandle | null>(null);
  const [state, setState] = useState<CallState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [lines, setLines] = useState<SubtitleLine[]>([]);
  const [opciones, setOpciones] = useState<string[]>(DEFAULT_REPLIES);
  const [alert, setAlert] = useState<{ message: string; tone: AlertTone } | null>(null);
  const [senas, setSenas] = useState<{ glosas: string[]; subtitulo: string; actual: number } | null>(null);
  const [destino, setDestino] = useState<Destino | null>(null);
  // Fotos de señas (D5). null = no están en este computador: se usa el intérprete dibujado.
  const prefs = usePreferencias();
  const manifestCargado = useManifestSenas();
  const manifest = prefs.interprete === "fotos" ? manifestCargado : null;
  const [frase, setFrase] = useState(0); // sube con cada glosas_para_senar para reiniciar el reproductor
  const [senando, setSenando] = useState(false);
  // true desde que el cliente responde hasta que el otro lado vuelve a hablar: no se ofrecen respuestas.
  const [esperando, setEsperando] = useState(false);
  const callRef = useRef<CallHandle | null>(null);
  const destinoRef = useRef<Destino | null>(null); // onMessage corre fuera del render: lee el destino de aquí
  const chatRef = useRef<HTMLDivElement>(null);

  // Contador de duración mientras la llamada está en curso.
  useEffect(() => {
    if (state !== "live") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  // Intérprete dibujado (sin fotos): avanza una seña cada AVATAR_MS_POR_SENA para mover las manos.
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

  // Atajo del ícono (?llamar=urgencias): llama apenas abre la app.
  const autoHecho = useRef(false);
  useEffect(() => {
    if (autoLlamar && !autoHecho.current) {
      autoHecho.current = true;
      void llamar(URGENCIAS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLlamar]);

  // Cortar la conexión si el usuario cierra la pantalla en medio de una llamada.
  useEffect(() => () => callRef.current?.leave(), []);

  function onMessage(msg: MensajePuente) {
    switch (msg.tipo) {
      case "ejecutivo_dice":
        setLines((l) => [...l, { id: nuevoId(), who: "ejecutivo", time: hora(), text: msg.simple ?? msg.texto, original: msg.texto }]);
        setOpciones(msg.opciones?.length ? msg.opciones : DEFAULT_REPLIES);
        setEsperando(false);
        // Sin v4 activa no llega glosas_para_senar: el subtítulo del avatar igual muestra lo último que dijeron.
        setSenas((s) => ({ glosas: s?.glosas ?? [], actual: s?.actual ?? 0, subtitulo: msg.simple ?? msg.texto }));
        break;
      case "estado":
        if (msg.valor === "llamada_iniciada") {
          setState("live"); // CallStatus ya muestra "En llamada" + duración; no hace falta otro aviso.
          setAlert(null);
          // Al contestar, se ofrecen las frases iniciales del destino para hablar primero con un toque.
          setOpciones((o) => (destinoRef.current?.frasesIniciales.length ? destinoRef.current.frasesIniciales : o));
          setSenas((s) => s ?? { glosas: [], actual: 0, subtitulo: "Contestaron.\nCuéntales qué pasa." });
        } else {
          setState("ended");
          callRef.current?.leave();
          callRef.current = null;
          setCall(null);
        }
        break;
      case "glosas_para_senar":
        // Glosas tal cual (con TEXTO:): el reproductor decide cómo mostrar cada una.
        setSenas({ glosas: msg.glosas, subtitulo: msg.subtitulo, actual: 0 });
        setFrase((f) => f + 1);
        break;
    }
  }

  // Se cortó la conexión sin que el usuario colgara: se avisa y la llamada termina (no queda en "En llamada").
  function onDesconectado() {
    callRef.current = null;
    setCall(null);
    setEsperando(false);
    setState("ended");
    setAlert({ message: "Se cortó la conexión con Puente. Revisa tu internet y vuelve a llamar.", tone: "error" });
  }

  async function llamar(d: Destino) {
    setDestino(d);
    destinoRef.current = d;
    setLines([]);
    setSenas(null);
    setOpciones(DEFAULT_REPLIES);
    setEsperando(false);
    setSeconds(0);
    setAlert(null);
    setState("connecting");
    try {
      const handle = mock ? await joinMockCall({ onMessage }) : await joinCall({ onMessage, onDesconectado });
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
    setLines((l) => [...l, { id: nuevoId(), who: "cliente", time: hora(), text: texto }]);
    setOpciones([]); // mientras responden no hay nada que tocar
    setEsperando(true);
    try {
      await callRef.current.send({ tipo: "cliente_dice", texto });
    } catch {
      setAlert({ message: "No se pudo enviar tu mensaje. Inténtalo de nuevo.", tone: "error" });
    }
  }

  // Sin sesión: login (demo: cualquier usuario y contraseña).
  if (!prefs.sesion) return <Login />;

  // Inicio (antes de llamar).
  if (state === "idle") {
    return (
      <AppShell onLlamar={llamar} aviso={<VisualAlert message={alert?.message ?? null} tone={alert?.tone} />} />
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
          <button type="button" className="hangup" onClick={colgar} aria-label="Colgar">
            <Icon name="colgar" size={26} />
          </button>
        )}
      </header>

      <SignAvatar
        glosses={senas?.glosas ?? []}
        current={senas?.actual}
        subtitle={subtitulo}
        signing={manifest ? senando : !!senas && senas.actual < senas.glosas.length}
        apariencia={prefs.avatar}
        player={
          manifest ? <SenasFotos manifest={manifest} glosas={senas?.glosas ?? []} frase={frase} onSenando={setSenando} velocidad={prefs.velocidad} /> : undefined
        }
      />

      <div className="chat" ref={chatRef}>
        {lines.length > 0 && <Subtitles lines={lines} showOriginal={prefs.verOriginal} otherName={destino?.corto ?? "Ejecutivo"} fotoCliente={<FotoPerfil size={28} />} />}
        {esperando && enLlamada && (
          <p className="typing" aria-live="polite">
            <span className="dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            {destino?.corto ?? "El ejecutivo"} está respondiendo
          </p>
        )}
      </div>

      <VisualAlert message={alert?.message ?? null} tone={alert?.tone} />

      {enLlamada && (
        <Composer compact onSend={decir} placeholder="Escribe un mensaje">
          {opciones.length > 0 && <QuickReplies options={opciones} onPick={decir} />}
        </Composer>
      )}
      {state === "ended" && (
        <Calificacion
          quien={destino?.nombre ?? "Llamada"}
          sigla={(destino && "sigla" in destino ? String(destino.sigla) : destino?.corto.slice(0, 2) ?? "P").toUpperCase()}
          duracion={formatDuration(seconds)}
          onListo={volver}
        />
      )}
    </main>
  );
}
