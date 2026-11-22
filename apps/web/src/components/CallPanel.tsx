"use client";

// Pantalla de llamada como videollamada (estilo FaceTime):
//   arriba    el avatar 3D del ejecutivo haciéndote señas, con subtítulos grandes de lo que dice
//   abajo     tu cámara: lee tus señas (v3, hoy simulado) y, cuando las reconoce, tocas Enviar
//   chat      modo aparte con la conversación, respuestas sugeridas y teclado
//   controles Chat, Cámara, Enviar y Colgar
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  Composer, Icon, Interprete, QuickReplies, Subtitles, VisualAlert, DEFAULT_REPLIES, formatDuration,
  type AlertTone, type CallState, type SubtitleLine,
} from "@puente/ui";
import { LIMITES, type MensajePuente } from "@puente/glosses";
import { despertarServidor, joinCall, type CallHandle } from "@/lib/call";
import { joinMockCall, type EventoVoz } from "@/lib/mockCall";
import { URGENCIAS, type Destino } from "@/lib/contactos";
import { usePreferencias } from "@/lib/preferencias";
import { AppShell } from "./AppShell";
import { Calificacion } from "./Calificacion";
import { RECONOCER_SENAS, iniciarReconocedor, precargarReconocedor, type Reconocedor } from "@/lib/reconocimiento";
import { mensajeCliente } from "@/lib/respuesta";
import { precargarAvatar } from "@/lib/avatarAssets";
import { CamaraPropia, type Conversion, type Lectura, type Voz } from "./CamaraPropia";
import { Login } from "./Login";
import { FotoPerfil, PERFIL } from "./MenuPerfil";

// three.js (~600 kB) solo se baja al entrar a una llamada, no en el login ni el inicio.
const AvatarVRM = dynamic(() => import("./AvatarVRM").then((m) => m.AvatarVRM), { ssr: false });

const AVATAR_MS_POR_SENA = 1300; // intérprete dibujado (respaldo): una seña cada 1,3 s
// La frase convertida se queda a la vista hasta que empiezas a señar la siguiente respuesta (o pasa este tiempo).
const CONVERSION_MAX_MS = 90_000;
const LECTURA_SIMULADA_MS = 2600; // TODO(v3): lo que "tarda" la cámara en reconocer una frase

const hora = () => new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

// Id local de cada línea de subtítulo. No se usa crypto.randomUUID: solo existe con HTTPS y falla al probar
// desde el celular por http://192.168.x.x:3000. (Aporte de Raimundo.)
const esEscritorio = () => typeof window !== "undefined" && window.matchMedia?.("(min-width: 1024px)").matches === true;

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
  // Subtítulo del ejecutivo: siempre visible completo; el avatar resalta lo que va firmando (0 a 1). 1 = todo resaltado.
  const [progSub, setProgSub] = useState(1);
  // Texto simple del turno actual (de ejecutivo_dice): glosas_para_senar no lo pisa, llegue antes o después.
  const simpleTurno = useRef<string | null>(null);
  const [sin3d, setSin3d] = useState(false); // el modelo 3D no cargó: se usa el intérprete dibujado
  const [destino, setDestino] = useState<Destino | null>(null);
  const prefs = usePreferencias();
  const [camara, setCamara] = useState(true);
  const [lectura, setLectura] = useState<Lectura>({ estado: "esperando" });
  // Lectura real de señas (NEXT_PUBLIC_RECONOCER_SENAS=1): el <video> de la cámara y las glosas reconocidas en este turno.
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const glosasRef = useRef<string[]>([]);
  // Tus señas y la frase en que se convirtieron: se mantienen a la vista el tiempo de leerlas aunque el otro lado ya responda.
  const [conversion, setConversion] = useState<Conversion | null>(null);
  const timerConv = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Llamada simulada: seguimiento de la voz, para que la frase convertida salga exactamente a la par del audio.
  const [voz, setVoz] = useState<Voz | null>(null);
  // ?debug en la dirección: muestra qué glosas consideró el reconocedor en cada seña (para ensayar).
  const [debug, setDebug] = useState<string | null>(null);
  const debugActivo = useRef(false);
  useEffect(() => {
    debugActivo.current = new URLSearchParams(window.location.search).has("debug");
  }, []);
  // En el computador el chat queda abierto al lado (hay espacio); en el celular es una hoja que se abre.
  const [chat, setChat] = useState(esEscritorio);
  // true desde que el cliente responde hasta que el otro lado vuelve a hablar.
  const [esperando, setEsperando] = useState(false);
  const esperandoRef = useRef(false);
  esperandoRef.current = esperando;
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
    if (RECONOCER_SENAS || state !== "live" || esperando || !camara || lectura.estado !== "leyendo") return;
    const texto = opciones[0];
    if (!texto) return;
    const id = setTimeout(() => setLectura({ estado: "listo", texto }), LECTURA_SIMULADA_MS);
    return () => clearTimeout(id);
  }, [state, esperando, camara, lectura.estado, opciones]);

  // Una glosa reconocida (por la cámara) se suma a las de este turno. Solo usa refs y setters: es seguro llamarla desde cualquier efecto.
  function registrarGlosa(g: string) {
    if (esperandoRef.current) return;
    if (glosasRef.current.length === 0) setConversion(null); // empezó una respuesta nueva: la conversión anterior ya se leyó
    glosasRef.current = [...glosasRef.current, g];
    setLectura({ estado: "listo", texto: glosasRef.current.join(" ") });
    setAlert(null);
  }

  // ?debug: window.__senas(["HOLA", ...]) simula señas reconocidas sin cámara (para ensayar y probar el flujo).
  useEffect(() => {
    if (!debugActivo.current) return;
    (window as unknown as { __senas?: (g: string[]) => void }).__senas = (g) => g.forEach(registrarGlosa);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // La API gratis de Render se duerme: se despierta al abrir la app, no recién al llamar.
  useEffect(() => {
    if (!mock) despertarServidor();
  }, [mock]);

  // MediaPipe se empieza a bajar al marcar (no al contestar): habla primero la persona sorda.
  useEffect(() => {
    if (state !== "connecting") return;
    precargarAvatar();
    if (RECONOCER_SENAS) precargarReconocedor().catch(() => {});
  }, [state]);

  // Lectura real: MediaPipe + @puente/signs reconocen cada seña (con pausa entre señas) y se acumulan como glosas del turno.
  useEffect(() => {
    if (!RECONOCER_SENAS || state !== "live" || !camara || !video) return;
    let rec: Reconocedor | null = null;
    let cancelado = false;
    iniciarReconocedor(video, {
      onGlosa: registrarGlosa,
      onDuda: (a, b) => setAlert({ message: `No se distingue: ${a} o ${b}. Repite la seña.`, tone: "info" }),
      onError: (e) => console.error("reconocimiento de señas", e),
      onRanking: (r) => debugActivo.current && setDebug(r.map((x) => `${x.gloss} ${x.dist.toFixed(2)}`).join(" · ")),
      pausado: () => esperandoRef.current,
    })
      .then((r) => (cancelado ? r.detener() : (rec = r)))
      .catch(() => setAlert({ message: "No se pudo iniciar la lectura de señas. Puedes responder en el chat.", tone: "error" }));
    return () => {
      cancelado = true;
      rec?.detener();
    };
  }, [state, camara, video]);

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
  useEffect(() => () => {
    callRef.current?.leave();
    if (timerConv.current) clearTimeout(timerConv.current);
  }, []);

  function onMessage(msg: MensajePuente) {
    switch (msg.tipo) {
      case "ejecutivo_dice":
        setLines((l) => [...l, { id: nuevoId(), who: "ejecutivo", time: hora(), text: msg.simple ?? msg.texto, original: msg.texto }]);
        setOpciones(msg.opciones?.length ? msg.opciones : DEFAULT_REPLIES);
        setEsperando(false);
        setLectura({ estado: "leyendo" });
        glosasRef.current = [];
        // El subtítulo es el canal principal: se muestra completo al tiro, sin esperar al avatar (antes quedaba oculto
        // hasta 3,5 s). Sin v4 activa no llega glosas_para_senar: el subtítulo igual muestra lo último que dijeron.
        simpleTurno.current = msg.simple ?? msg.texto;
        setProgSub(1);
        setSenas((s) => ({ glosas: s?.glosas ?? [], actual: s?.actual ?? 0, subtitulo: msg.simple ?? msg.texto }));
        break;
      case "estado":
        if (msg.valor === "llamada_iniciada") {
          setState("live");
          setAlert(null);
          // Al contestar, la primera frase es la del destino (habla primero la persona sorda).
          setOpciones((o) => (destinoRef.current?.frasesIniciales.length ? destinoRef.current.frasesIniciales : o));
          setLectura({ estado: "leyendo" });
          glosasRef.current = [];
          setSenas((s) => s ?? { glosas: [], actual: 0, subtitulo: "Contestaron.\nCuéntales qué necesitas." });
        } else {
          setState("ended");
          callRef.current?.leave();
          callRef.current = null;
          setCall(null);
        }
        break;
      case "glosas_para_senar":
        // Una sola fuente de texto por turno: si ya llegó ejecutivo_dice, se mantiene su texto simple.
        setSenas({ glosas: msg.glosas, subtitulo: simpleTurno.current ?? msg.subtitulo, actual: 0 });
        setFrase((f) => f + 1);
        setProgSub(0); // empieza el resaltado; el texto sigue visible (SubtituloProgresivo)
        break;
      case "cliente_dijo":
        // La frase en español en que se convirtió lo que señaste (o escribiste): se ve en tu cámara y en el chat.
        setLectura((l) => (l.estado === "enviado" ? { ...l, convertido: msg.texto } : l));
        setConversion((c) => (c ? { ...c, frase: msg.texto } : c));
        setVoz({ inicio: null, charIndex: null, terminado: false });
        if (timerConv.current) clearTimeout(timerConv.current);
        timerConv.current = setTimeout(() => setConversion(null), CONVERSION_MAX_MS);
        setLines((ls) => {
          const i = ls.map((x) => x.who).lastIndexOf("cliente");
          const previa = i >= 0 ? ls[i] : undefined;
          return previa ? ls.map((x, k) => (k === i ? { ...x, text: msg.texto, original: previa.original ?? previa.text } : x)) : ls;
        });
        break;
    }
  }

  // Se cortó la conexión sin que el usuario colgara: se avisa y la llamada termina.
  function onDesconectado() {
    callRef.current = null;
    setCall(null);
    setEsperando(false);
    setState("ended");
    setAlert({ message: "Se cortó la conexión con Bridge. Revisa tu internet y vuelve a llamar.", tone: "error" });
  }

  function eventoVoz(e: EventoVoz) {
    if (e.tipo === "inicio") setVoz({ inicio: performance.now(), charIndex: null, terminado: false });
    else if (e.tipo === "palabra") setVoz((v) => (v ? { ...v, charIndex: e.charIndex } : v));
    else setVoz((v) => (v ? { ...v, terminado: true } : v));
    if (e.tipo === "fin" && debugActivo.current) setDebug(`voz: duró ${e.ms} ms`);
  }

  async function llamar(d: Destino) {
    setDestino(d);
    destinoRef.current = d;
    setLines([]);
    setSenas(null);
    simpleTurno.current = null;
    setOpciones(DEFAULT_REPLIES);
    setEsperando(false);
    setSeconds(0);
    setAlert(null);
    setLectura({ estado: "esperando" });
    setConversion(null);
    setChat(esEscritorio());
    setState("connecting");
    try {
      const handle = mock
        ? await joinMockCall({ onMessage, guion: d.guion, onVoz: eventoVoz })
        : await joinCall({ onMessage, onDesconectado, destino: d.id });
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

  // `deSenas`: solo el botón Enviar de la cámara. El chat y las sugerencias siempre mandan su texto (ver lib/respuesta).
  async function decir(texto: string, deSenas = false) {
    if (!callRef.current) return;
    simpleTurno.current = null; // el próximo turno del ejecutivo trae su propio texto
    setLectura({ estado: "enviado", texto });
    setLines((l) => [...l, { id: nuevoId(), who: "cliente", time: hora(), text: texto }]);
    setOpciones([]);
    setEsperando(true);
    try {
      // Con lectura real de señas se mandan las glosas (el agente las convierte en una frase y la dice); si no, el texto.
      const msg = mensajeCliente(texto, RECONOCER_SENAS ? glosasRef.current : [], deSenas);
      if (msg.tipo === "glosas_cliente") {
        setConversion({ glosas: texto });
        if (timerConv.current) clearTimeout(timerConv.current);
        timerConv.current = setTimeout(() => setConversion(null), CONVERSION_MAX_MS); // respaldo si la frase convertida nunca llega
      }
      await callRef.current.send(msg);
      glosasRef.current = [];
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
  // Con el avatar dibujado (respaldo) el avance sale de la seña en curso; con el 3D, de su progreso.
  const fraccionSub = sin3d ? (senas && senas.glosas.length ? Math.min(1, senas.actual / senas.glosas.length) : 1) : progSub;
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
            <AvatarVRM glosas={senas?.glosas ?? []} frase={frase} velocidad={prefs.velocidad} onSenando={setSenando3d} onProgreso={setProgSub} onFalla={() => setSin3d(true)} />
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
            <SubtituloProgresivo texto={subtitulo} fraccion={enLlamada ? fraccionSub : 1} />
          </p>
        )}
      </section>

      {/* Abajo: tú, con la cámara que lee tus señas */}
      <CamaraPropia encendida={camara && state !== "ended"} lectura={lecturaVisible} onVideo={RECONOCER_SENAS ? setVideo : undefined} mostrarTexto={RECONOCER_SENAS} conversion={RECONOCER_SENAS ? conversion : null} voz={voz} />

      <VisualAlert message={alert?.message ?? null} tone={alert?.tone} />
      {debug && (
        <p style={{ position: "fixed", left: 8, right: 8, bottom: 8, margin: 0, padding: "6px 10px", borderRadius: 8, background: "rgba(0,0,0,0.8)", color: "#9f9", font: "12px monospace", zIndex: 50 }}>
          candidatas: {debug}
        </p>
      )}

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
            onClick={() => lectura.estado === "listo" && decir(lectura.texto, true)}
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

/** Muestra el texto palabra por palabra según `fraccion` (0 a 1). Las palabras que faltan ocupan su lugar sin verse: el texto no se mueve. */
function SubtituloProgresivo({ texto, fraccion }: { texto: string; fraccion: number }) {
  const partes = texto.split(/(\s+)/);
  const palabras = partes.filter((p) => p.trim()).length;
  const visibles = fraccion >= 1 ? palabras : fraccion <= 0 ? 0 : Math.ceil(palabras * fraccion);
  let n = 0;
  return (
    <>
      {partes.map((p, i) => {
        if (!p.trim()) return p;
        n += 1;
        return (
          <span key={i} style={n <= visibles ? undefined : { opacity: 0.45 }}>
            {p}
          </span>
        );
      })}
    </>
  );
}
