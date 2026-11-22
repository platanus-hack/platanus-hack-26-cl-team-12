"use client";

// Tu cámara en la videollamada: la cámara frontal del celular (espejada, como en FaceTime), con tus subtítulos encima.
// La lectura de señas es de v3 (frente C, Tomás): hoy se simula. Al tocar una respuesta sugerida se muestra
// "Leyendo tus señas…" y luego el texto, como si la cámara lo hubiera reconocido.
// TODO(v3): conectar el clasificador de @puente/signs (MediaPipe) y mandar `glosas_cliente`.
// La cámara no graba ni sale del celular (ADR-0010: el video se procesa en el dispositivo).
import { useEffect, useRef, useState } from "react";
import { Icon } from "@puente/ui";

type EstadoCamara = "pidiendo" | "activa" | "apagada" | "sin-permiso";

export function CamaraPropia({ encendida, subtitulo, leyendo }: { encendida: boolean; subtitulo: string | null; leyendo: boolean }) {
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
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } }, audio: false })
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

  return (
    <section className="vl-tile vl-yo" aria-label="Tu cámara">
      <video ref={video} className={estado === "activa" ? "vl-video" : "vl-video oculto"} autoPlay muted playsInline />
      {estado !== "activa" && (
        <div className="vl-sin-camara">
          <Icon name="camara" size={30} />
          <span>
            {estado === "pidiendo" && "Abriendo la cámara…"}
            {estado === "apagada" && "Cámara apagada"}
            {estado === "sin-permiso" && "Permite el uso de la cámara para hacer señas"}
          </span>
        </div>
      )}
      <span className="vl-etiqueta">
        <span className={estado === "activa" ? "vl-punto vivo" : "vl-punto"} aria-hidden /> Tú · {estado === "activa" ? "Leyendo tus señas" : "Señas en pausa"}
      </span>
      {(leyendo || subtitulo) && (
        <p className={leyendo ? "vl-sub vl-sub-yo leyendo" : "vl-sub vl-sub-yo"} aria-live="polite">
          {leyendo ? "Leyendo tus señas…" : subtitulo}
        </p>
      )}
    </section>
  );
}
