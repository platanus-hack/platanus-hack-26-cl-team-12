"use client";

// Historial de llamadas (simulado). TODO(real-data): leer las llamadas reales del usuario cuando haya backend con sesión.
import { useState } from "react";
import { Icon } from "@puente/ui";

interface Llamada {
  id: string;
  cuando: string;
  quien: string;
  duracion: string;
  resultado: string;
  tono: "ok" | "neutro" | "fallo";
  resumen: string;
}

const LLAMADAS: Llamada[] = [
  { id: "1", cuando: "Hoy, 19:42", quien: "Urgencias Clínica Santa María", duracion: "3 min", resultado: "Ambulancia enviada", tono: "ok", resumen: "Pediste una ambulancia porque tu hijo se cayó y se quebró el codo. Te dijeron que llegaba en unos 10 minutos y que no le movieras el brazo." },
  { id: "2", cuando: "Ayer, 10:15", quien: "Clínica Santa María", duracion: "5 min", resultado: "Hora confirmada", tono: "ok", resumen: "Te confirmaron hora con medicina general el lunes 24 a las 10:00. Tienes que llegar 15 minutos antes con tu carnet." },
  { id: "3", cuando: "18 nov, 16:03", quien: "CESFAM Providencia", duracion: "1 min", resultado: "No contestaron", tono: "fallo", resumen: "Nadie contestó. Puedes volver a llamar desde Emergencias o desde el inicio." },
  { id: "4", cuando: "12 nov, 11:30", quien: "Fonasa", duracion: "7 min", resultado: "Consulta resuelta", tono: "neutro", resumen: "Preguntaste por el bono para una consulta médica. Te dijeron que lo puedes comprar en la app de Fonasa." },
];

export function Historial() {
  const [abierta, setAbierta] = useState<string | null>("1");
  return (
    <div className="seccion">
      <h1 className="titulo-seccion">Historial</h1>
      <p className="lede">Tus llamadas recientes. Toca una para ver el resumen.</p>
      <ul className="group">
        {LLAMADAS.map((l) => {
          const open = abierta === l.id;
          return (
            <li key={l.id} className="hist">
              <button type="button" className="hist-fila" aria-expanded={open} onClick={() => setAbierta(open ? null : l.id)}>
                <span className="row-ico" aria-hidden>
                  <Icon name="llamar" size={18} />
                </span>
                <span className="row-txt">
                  <strong>{l.quien}</strong>
                  <span>
                    {l.cuando} · {l.duracion}
                  </span>
                </span>
                <span className={`chip-estado ${l.tono}`}>{l.resultado}</span>
              </button>
              {open && <p className="hist-resumen">{l.resumen}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
