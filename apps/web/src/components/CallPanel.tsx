"use client";

// Pantalla de llamada como videollamada (estilo FaceTime):
//   arriba   el avatar del ejecutivo haciéndote señas, con subtítulos grandes de lo que dice
//   abajo    tu cámara, que lee tus señas (v3, hoy simulado), con tus subtítulos
//   controles respuestas rápidas, teclado, conversación completa y colgar
import { useEffect, useRef, useState } from "react";
import {
  Composer, Icon, Interprete, QuickReplies, Subtitles, VisualAlert, DEFAULT_REPLIES, formatDuration,
  type AlertTone, type CallState, type SubtitleLine,
} from "@puente/ui";
import { LIMITES, type MensajePuente } from "@puente/glosses";
import { joinCall, type CallHandle } from "@/lib/call";
import { joinMockCall } from "@/lib/mockCall";
import { URGENCIAS, type Destino } from "./Inicio";
import { AppShell } from "./AppShell";
import { Calificacion } from "./Calificacion";
import { Login } from "./Login";
import { FotoPerfil, PERFIL } from "./MenuPerfil";
import { usePreferencias } from "@/lib/preferencias";
import { CamaraPropia } from "./CamaraPropia";

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
  const prefs = usePreferencias();
  // Videollamada: cámara propia, subtítulo de lo que "reconoció" la cámara y paneles que se abren.
  const [camara, setCamara] = useState(true);
  const [miSubtitulo, setMiSubtitulo] = useState<string | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [panel, setPanel] = useState<"ninguno" | "teclado" | "conversacion">("ninguno");
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

  // El avatar del ejecutivo avanza una seña cada AVATAR_MS_POR_SENA (mueve las manos mientras hay señas).
  useEffect(() => {
    if (!senas || senas.actual >= senas.glosas.length) return;
    const id = setTimeout(() => setSenas((s) => (s ? { ...s, actual: s.actual + 1 } : s)), AVATAR_MS_POR_SENA);
    return () => clearTimeout(id);
  }, [senas]);

  // El chat baja solo al último mensaje: nunca hay que bajar a mano para ver qué te dijeron.
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [lines, panel]);

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
    setMiSubtitulo(null);
    setLeyendo(false);
    setPanel("ninguno");
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

  /** Respuesta "por señas" (simulada): la cámara muestra que está leyendo y luego el texto reconocido. TODO(v3). */
  function responderConSenas(texto: string) {
    if (!callRef.current || leyendo) return;
    setOpciones([]);
    setLeyendo(true);
    setTimeout(() => {
      setLeyendo(false);
      void decir(texto);
    }, 1100);
  }

  async function decir(texto: string) {
    if (!callRef.current) return;
    setMiSubtitulo(texto);
    setPanel((p) => (p === "teclado" ? "ninguno" : p));
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

  // Llamada (conectando, en curso o terminada): videollamada a pantalla completa.
  const enLlamada = state === "live";
  const subtitulo = senas?.subtitulo ?? (state === "connecting" ? "Llamando…" : "Esperando que te hablen…");
  const senando = !!senas && senas.actual < senas.glosas.length;

  return (
    <main className="vl">
      <h1 className="pu-sr">Llamada con {destino?.nombre ?? "la clínica"}</h1>
      {/* Arriba: el ejecutivo, en lengua de señas (avatar) */}
      <section className="vl-tile vl-ejecutivo" aria-label={`Intérprete de ${destino?.corto ?? "la llamada"}`}>
        <div className="vl-avatar">
          <Interprete signing={senando || state === "connecting"} apariencia={prefs.avatar} />
        </div>
        <header className="vl-cabeza">
          <span className="row-txt">
            <strong>{destino?.nombre}</strong>
            <span>{state === "connecting" ? "Llamando…" : state === "live" ? `En llamada · ${formatDuration(seconds)}` : "Llamada terminada"}</span>
          </span>
        </header>
        {esperando && enLlamada ? (
          <p className="vl-sub vl-sub-ejecutivo esperando" aria-live="polite">
            <span className="dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            {destino?.corto ?? "El ejecutivo"} está respondiendo
          </p>
        ) : (
          <p className="vl-sub vl-sub-ejecutivo" aria-live="polite">
            {subtitulo}
          </p>
        )}
      </section>

      {/* Abajo: tú, con la cámara que lee tus señas */}
      <CamaraPropia encendida={camara && state !== "ended"} subtitulo={miSubtitulo} leyendo={leyendo} />

      <VisualAlert message={alert?.message ?? null} tone={alert?.tone} />

      {/* Respuestas rápidas: simulan una respuesta por señas */}
      {enLlamada && opciones.length > 0 && panel === "ninguno" && (
        <div className="vl-respuestas">
          <span className="vl-respuestas-titulo">Responder con señas</span>
          <QuickReplies options={opciones} onPick={responderConSenas} label="Respuestas sugeridas" />
        </div>
      )}

      {/* Teclado (por si no puedes hacer señas) */}
      {enLlamada && panel === "teclado" && (
        <div className="vl-hoja">
          <Composer compact onSend={decir} placeholder="Escribe un mensaje" maxLength={LIMITES.max_texto} />
        </div>
      )}

      {/* Conversación completa */}
      {panel === "conversacion" && (
        <div className="vl-hoja vl-hoja-alta" ref={chatRef}>
          {prefs.compartirUbicacion && (
            // TODO(real-data): mandar la ubicación a la API (hoy el contrato no tiene ese mensaje).
            <p className="nota-sistema">
              <Icon name="ubicacion" size={14} /> Compartiste tu ubicación: {PERFIL.direccion}
            </p>
          )}
          {lines.length > 0 ? (
            <Subtitles lines={lines} showOriginal={prefs.verOriginal} otherName={destino?.corto ?? "Ejecutivo"} fotoCliente={<FotoPerfil size={28} />} />
          ) : (
            <p className="nota centrada">Todavía no hay mensajes.</p>
          )}
        </div>
      )}

      {/* Controles */}
      {state !== "ended" && (
        <nav className="vl-controles" aria-label="Controles de la llamada">
          <button type="button" className={panel === "conversacion" ? "vl-ctrl on" : "vl-ctrl"} aria-pressed={panel === "conversacion"} onClick={() => setPanel((p) => (p === "conversacion" ? "ninguno" : "conversacion"))}>
            <Icon name="subtitulos" size={22} />
            <span>Conversación</span>
          </button>
          <button type="button" className={panel === "teclado" ? "vl-ctrl on" : "vl-ctrl"} aria-pressed={panel === "teclado"} disabled={!enLlamada} onClick={() => setPanel((p) => (p === "teclado" ? "ninguno" : "teclado"))}>
            <Icon name="escribir" size={22} />
            <span>Escribir</span>
          </button>
          <button type="button" className={camara ? "vl-ctrl" : "vl-ctrl on"} aria-pressed={!camara} onClick={() => setCamara((c) => !c)}>
            <Icon name="camara" size={22} />
            <span>{camara ? "Cámara" : "Sin cámara"}</span>
          </button>
          <button type="button" className="vl-ctrl colgar" onClick={colgar} disabled={!call} aria-label="Colgar">
            <Icon name="colgar" size={24} />
            <span>Colgar</span>
          </button>
        </nav>
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
