"use client";

// Tu cámara en la videollamada: la cámara frontal del celular (espejada, como en FaceTime).
// Lee tus señas; cuando las reconoce, avisa "Señas listas" y tú tocas Enviar. Lo enviado aparece como subtítulo.
// La lectura de señas es de v3 (frente C, Tomás): hoy se simula. TODO(v3): conectar el clasificador de @puente/signs
// (MediaPipe) y mandar `glosas_cliente`. La cámara no graba ni sale del celular (ADR-0010).
import { useEffect, useRef, useState } from "react";
import { Icon } from "@puente/ui";

type EstadoCamara = "pidiendo" | "activa" | "apagada" | "sin-permiso";

/** esperando: no te toca. leyendo: mirando tus señas. listo: reconoció una frase (sin mostrarla). enviado: ya se mandó. */
export type Lectura = { estado: "esperando" } | { estado: "leyendo" } | { estado: "listo"; texto: string } | { estado: "enviado"; texto: string };

export function CamaraPropia({ encendida, lectura }: { encendida: boolean; lectura: Lectura }) {
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
      })
      .catch(() => vivo && setEstado("sin-permiso"));
    return () => {
      vivo = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
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
      {activa && lectura.estado === "leyendo" && (
        <p className="vl-sub vl-sub-yo leyendo" aria-live="polite">
          Haz tus señas frente a la cámara…
        </p>
      )}
      {activa && lectura.estado === "listo" && (
        <p className="vl-sub vl-sub-yo listo" aria-live="polite">
          <Icon name="listo" size={20} /> Entendí tus señas. Toca Enviar.
        </p>
      )}
      {lectura.estado === "enviado" && (
        <p className="vl-sub vl-sub-yo" aria-live="polite">
          {lectura.texto}
        </p>
      )}
    </section>
  );
}
