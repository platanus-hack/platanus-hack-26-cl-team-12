"use client";

// Pantalla de llamada como videollamada (estilo FaceTime):
//   arriba    el avatar 3D del ejecutivo haciéndote señas, con subtítulos grandes de lo que dice
//   abajo     tu cámara: lee tus señas (v3, hoy simulado) y, cuando las reconoce, tocas Enviar
//   chat      modo aparte con la conversación, respuestas sugeridas y teclado
//   controles Chat, Cámara, Enviar y Colgar
import { useEffect, useRef, useState } from "react";
import {
  Composer, Icon, Interprete, QuickReplies, Subtitles, VisualAlert, DEFAULT_REPLIES, formatDuration,
  type AlertTone, type CallState, type SubtitleLine,
} from "@puente/ui";
import { LIMITES, type MensajePuente } from "@puente/glosses";
import { joinCall, type CallHandle } from "@/lib/call";
import { joinMockCall } from "@/lib/mockCall";
import { URGENCIAS, type Destino } from "@/lib/contactos";
import { usePreferencias } from "@/lib/preferencias";
import { AppShell } from "./AppShell";
import { AvatarVRM } from "./AvatarVRM";
import { Calificacion } from "./Calificacion";
import { CamaraPropia, type Lectura } from "./CamaraPropia";
import { Login } from "./Login";
import { FotoPerfil, PERFIL } from "./MenuPerfil";

const AVATAR_MS_POR_SENA = 1300; // intérprete dibujado (respaldo): una seña cada 1,3 s
const LECTURA_SIMULADA_MS = 2600; // TODO(v3): lo que "tarda" la cámara en reconocer una frase

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
  const [frase, setFrase] = useState(0); // sube con cada glosas_para_senar: reinicia el avatar 3D
  const [senando3d, setSenando3d] = useState(false);
  const [sin3d, setSin3d] = useState(false); // el modelo 3D no cargó: se usa el intérprete dibujado
  const [destino, setDestino] = useState<Destino | null>(null);
  const prefs = usePreferencias();
  const [camara, setCamara] = useState(true);
  const [lectura, setLectura] = useState<Lectura>({ estado: "esperando" });
  const [chat, setChat] = useState(false);
  // true desde que el cliente responde hasta que el otro lado vuelve a hablar.
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

  // Intérprete dibujado (respaldo): avanza una seña cada AVATAR_MS_POR_SENA para mover las manos.
  useEffect(() => {
    if (!senas || senas.actual >= senas.glosas.length) return;
    const id = setTimeout(() => setSenas((s) => (s ? { ...s, actual: s.actual + 1 } : s)), AVATAR_MS_POR_SENA);
    return () => clearTimeout(id);
  }, [senas]);

  // Lectura de señas simulada (TODO(v3)): cuando te toca responder, la cámara "lee" y luego tienes Enviar.
  // Lo que reconoce es la respuesta del guion (en la llamada real lo dará el clasificador de @puente/signs).
  useEffect(() => {
    if (state !== "live" || esperando || !camara || lectura.estado !== "leyendo") return;
    const texto = opciones[0];
    if (!texto) return;
    const id = setTimeout(() => setLectura({ estado: "listo", texto }), LECTURA_SIMULADA_MS);
    return () => clearTimeout(id);
  }, [state, esperando, camara, lectura.estado, opciones]);

  // El chat baja solo al último mensaje.
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [lines, chat]);

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
        setLectura({ estado: "leyendo" });
        // Sin v4 activa no llega glosas_para_senar: el subtítulo igual muestra lo último que dijeron.
        setSenas((s) => ({ glosas: s?.glosas ?? [], actual: s?.actual ?? 0, subtitulo: msg.simple ?? msg.texto }));
        break;
      case "estado":
        if (msg.valor === "llamada_iniciada") {
          setState("live");
          setAlert(null);
          // Al contestar, la primera frase es la del destino (habla primero la persona sorda).
          setOpciones((o) => (destinoRef.current?.frasesIniciales.length ? destinoRef.current.frasesIniciales : o));
          setLectura({ estado: "leyendo" });
          setSenas((s) => s ?? { glosas: [], actual: 0, subtitulo: "Contestaron.\nCuéntales qué necesitas." });
        } else {
          setState("ended");
          callRef.current?.leave();
          callRef.current = null;
          setCall(null);
        }
        break;
      case "glosas_para_senar":
        setSenas({ glosas: msg.glosas, subtitulo: msg.subtitulo, actual: 0 });
        setFrase((f) => f + 1);
        break;
    }
  }

  // Se cortó la conexión sin que el usuario colgara: se avisa y la llamada termina.
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
    setLectura({ estado: "esperando" });
    setChat(false);
    setState("connecting");
    try {
      const handle = mock ? await joinMockCall({ onMessage, guion: d.guion }) : await joinCall({ onMessage, onDesconectado, destino: d.id });
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
    setLectura({ estado: "enviado", texto });
    setLines((l) => [...l, { id: nuevoId(), who: "cliente", time: hora(), text: texto }]);
    setOpciones([]);
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
    return <AppShell onLlamar={llamar} aviso={<VisualAlert message={alert?.message ?? null} tone={alert?.tone} />} />;
  }

  const enLlamada = state === "live";
  const subtitulo = senas?.subtitulo ?? (state === "connecting" ? "Llamando…" : "Esperando que te hablen…");
  const senando = sin3d ? !!senas && senas.actual < senas.glosas.length : senando3d;
  const listoParaEnviar = enLlamada && lectura.estado === "listo";
  // Mientras responde el otro lado, la cámara solo muestra lo último que enviaste.
  const lecturaVisible: Lectura = enLlamada && !esperando ? lectura : lectura.estado === "enviado" ? lectura : { estado: "esperando" };

  return (
    <main className="vl">
      <h1 className="pu-sr">Llamada con {destino?.nombre ?? "la otra persona"}</h1>

      {/* Arriba: el ejecutivo, en lengua de señas (avatar 3D) */}
      <section className="vl-tile vl-ejecutivo" aria-label={`Intérprete de ${destino?.corto ?? "la llamada"}`}>
        <div className="vl-avatar">
          {sin3d ? (
            <Interprete signing={senando || state === "connecting"} apariencia={prefs.avatar} />
          ) : (
            <AvatarVRM glosas={senas?.glosas ?? []} frase={frase} velocidad={prefs.velocidad} onSenando={setSenando3d} onFalla={() => setSin3d(true)} />
          )}
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
            {destino?.corto ?? "La otra persona"} está respondiendo
          </p>
        ) : (
          <p className="vl-sub vl-sub-ejecutivo" aria-live="polite">
            {subtitulo}
          </p>
        )}
      </section>

      {/* Abajo: tú, con la cámara que lee tus señas */}
      <CamaraPropia encendida={camara && state !== "ended"} lectura={lecturaVisible} />

      <VisualAlert message={alert?.message ?? null} tone={alert?.tone} />

      {/* Modo chat: conversación, respuestas sugeridas y teclado */}
      {chat && (
        <div className="vl-hoja vl-hoja-alta">
          <div className="vl-chat" ref={chatRef}>
            {prefs.compartirUbicacion && destino?.guion === "urgencia" && (
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
          {enLlamada && (
            <Composer compact onSend={decir} placeholder="Escribe un mensaje" maxLength={LIMITES.max_texto}>
              {!esperando && opciones.length > 0 && <QuickReplies options={opciones} onPick={decir} label="Sugerencias" />}
            </Composer>
          )}
        </div>
      )}

      {/* Controles */}
      {state !== "ended" && (
        <nav className="vl-controles" aria-label="Controles de la llamada">
          <button type="button" className={chat ? "vl-ctrl on" : "vl-ctrl"} aria-pressed={chat} onClick={() => setChat((c) => !c)}>
            <Icon name="subtitulos" size={22} />
            <span>Chat</span>
          </button>
          <button type="button" className={camara ? "vl-ctrl" : "vl-ctrl on"} aria-pressed={!camara} onClick={() => setCamara((c) => !c)}>
            <Icon name="camara" size={22} />
            <span>{camara ? "Cámara" : "Sin cámara"}</span>
          </button>
          <button
            type="button"
            className={listoParaEnviar ? "vl-ctrl enviar listo" : "vl-ctrl enviar"}
            disabled={!listoParaEnviar}
            onClick={() => lectura.estado === "listo" && decir(lectura.texto)}
            aria-label={listoParaEnviar ? "Enviar lo que dijiste con señas" : "Enviar (esperando tus señas)"}
          >
            <Icon name="enviar" size={24} />
            <span>Enviar</span>
          </button>
          <button type="button" className="vl-ctrl colgar" onClick={colgar} disabled={!call} aria-label="Colgar">
            <Icon name="colgar" size={24} />
            <span>Colgar</span>
          </button>
        </nav>
      )}

      {state === "ended" && (
        <Calificacion quien={destino?.nombre ?? "Llamada"} sigla={destino?.sigla ?? "P"} duracion={formatDuration(seconds)} onListo={volver} />
      )}
    </main>
  );
}
