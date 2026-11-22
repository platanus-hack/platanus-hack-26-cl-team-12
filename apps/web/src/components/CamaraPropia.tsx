"use client";

// Tu cámara en la videollamada: la cámara frontal del celular (espejada, como en FaceTime).
// Lee tus señas; cuando las reconoce, avisa "Señas listas" y tú tocas Enviar. Lo enviado aparece como subtítulo.
// La lectura de señas es de v3 (frente C, Tomás): hoy se simula. TODO(v3): conectar el clasificador de @puente/signs
// (MediaPipe) y mandar `glosas_cliente`. La cámara no graba ni sale del celular (ADR-0010).
import { useEffect, useRef, useState } from "react";
import { Icon } from "@puente/ui";

/** Lectura real: cada palabra de la frase convertida aparece a este ritmo, y la frase queda en pantalla el tiempo de leerla. */
export const MS_REVELA_PALABRA = 260;
export const MS_LECTURA_EXTRA = 5000;
/** Cuánto se mantiene en pantalla la frase convertida: lo que tarda en aparecer más unos segundos para leerla. */
export const msConversionVisible = (frase: string) => frase.split(/\s+/).filter(Boolean).length * MS_REVELA_PALABRA + MS_LECTURA_EXTRA;

/** Lo que señaste y la frase en que se convirtió (null cuando ya pasó el tiempo de lectura). */
export interface Conversion {
  glosas: string;
  frase?: string;
}

type EstadoCamara = "pidiendo" | "activa" | "apagada" | "sin-permiso";

/** esperando: no te toca. leyendo: mirando tus señas. listo: reconoció una frase (sin mostrarla). enviado: ya se mandó. */
export type Lectura = { estado: "esperando" } | { estado: "leyendo" } | { estado: "listo"; texto: string } | { estado: "enviado"; texto: string; convertido?: string };

export function CamaraPropia({
  encendida,
  lectura,
  onVideo,
  mostrarTexto = false,
  conversion = null,
}: {
  encendida: boolean;
  lectura: Lectura;
  /** Entrega el <video> cuando la cámara está activa (null al apagarse), para leer las señas con MediaPipe. */
  onVideo?: (v: HTMLVideoElement | null) => void;
  /** Muestra las glosas reconocidas mientras haces señas (lectura real de señas). */
  mostrarTexto?: boolean;
  /** Lectura real: tus señas y la frase en que se convirtieron, visibles el tiempo suficiente para leerlas. */
  conversion?: Conversion | null;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [estado, setEstado] = useState<EstadoCamara>("pidiendo");

  useEffect(() => {
    if (!encendida) {
      setEstado("apagada");
      return;
    }
    let stream: MediaStream | null = null;
    let vivo = true;
    setEstado("pidiendo");
    if (!navigator.mediaDevices?.getUserMedia) {
      setEstado("sin-permiso");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 640 }, frameRate: { ideal: 24 } }, audio: false })
      .then((s) => {
        if (!vivo) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (video.current) video.current.srcObject = s;
        setEstado("activa");
        onVideo?.(video.current);
      })
      .catch(() => vivo && setEstado("sin-permiso"));
    return () => {
      vivo = false;
      stream?.getTracks().forEach((t) => t.stop());
      onVideo?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encendida]);

  const activa = estado === "activa";
  const etiqueta = !activa
    ? "Señas en pausa"
    : lectura.estado === "leyendo"
      ? "Leyendo tus señas"
      : lectura.estado === "listo"
        ? "Señas listas"
        : "Tú";

  return (
    <section className={lectura.estado === "listo" && activa ? "vl-tile vl-yo listo" : "vl-tile vl-yo"} aria-label="Tu cámara">
      <video ref={video} className={activa ? "vl-video" : "vl-video oculto"} autoPlay muted playsInline />
      {!activa && (
        <div className="vl-sin-camara">
          <Icon name="camara" size={30} />
          <span>
            {estado === "pidiendo" && "Abriendo la cámara…"}
            {estado === "apagada" && "Cámara apagada. Puedes responder en el chat."}
            {estado === "sin-permiso" && "Permite el uso de la cámara para hacer señas, o responde en el chat."}
          </span>
        </div>
      )}
      <span className="vl-etiqueta">
        <span className={activa && lectura.estado !== "esperando" ? "vl-punto vivo" : "vl-punto"} aria-hidden /> {etiqueta}
      </span>
      {activa && !conversion && lectura.estado === "leyendo" && (
        <p className="vl-sub vl-sub-yo leyendo" aria-live="polite">
          Haz tus señas frente a la cámara…
        </p>
      )}
      {activa && !conversion && lectura.estado === "listo" && (
        <p className="vl-sub vl-sub-yo listo" aria-live="polite">
          <Icon name="listo" size={20} /> {mostrarTexto ? <strong>{lectura.texto}</strong> : "Entendí tus señas. Toca Enviar."}
        </p>
      )}
      {lectura.estado === "enviado" && !mostrarTexto && (
        <p className="vl-sub vl-sub-yo" aria-live="polite">
          {lectura.texto}
        </p>
      )}
      {mostrarTexto && conversion && (
        // Lectura real de señas: lo que reconoció y la frase en que se convirtió (lo que se le dice al otro lado).
        <p className="vl-sub vl-sub-yo" aria-live="polite">
          <small style={{ display: "block", opacity: 0.7, letterSpacing: "0.04em" }}>{conversion.glosas}</small>
          {conversion.frase ? <FraseRevelada texto={conversion.frase} /> : <span style={{ display: "block" }}>Convirtiendo a frase…</span>}
        </p>
      )}
    </section>
  );
}

/** La frase va apareciendo palabra por palabra; las que faltan ocupan su lugar sin verse para que el texto no se mueva. */
function FraseRevelada({ texto }: { texto: string }) {
  const [visibles, setVisibles] = useState(0);
  const partes = texto.split(/(\s+)/);
  const palabras = partes.filter((p) => p.trim()).length;
  useEffect(() => {
    setVisibles(0);
    const id = setInterval(() => setVisibles((v) => (v >= palabras ? v : v + 1)), MS_REVELA_PALABRA);
    return () => clearInterval(id);
  }, [texto, palabras]);
  let n = 0;
  return (
    <span style={{ display: "block" }}>
      {partes.map((p, i) => {
        if (!p.trim()) return p;
        n += 1;
        return (
          <span key={i} style={n <= visibles ? undefined : { opacity: 0 }}>
            {p}
          </span>
        );
      })}
    </span>
  );
}
