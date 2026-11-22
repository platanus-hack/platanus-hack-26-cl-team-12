"use client";

// Catálogo de componentes de @puente/ui con datos de ejemplo. Visítalo en /design.
import { useState } from "react";
import {
  Button, CallStatus, Composer, GlossChip, Icon, iconNames, Logo, QuickReplies,
  SignAvatar, SignCamera, Subtitles, VisualAlert, type SubtitleLine,
} from "@puente/ui";

const EJEMPLO: SubtitleLine[] = [
  { id: "1", who: "ejecutivo", time: "10:41", text: "Hola. Usted habla con la Clínica. ¿En qué le ayudo?", original: "Buenos días, Clínica Santa María, le saluda Carolina, ¿en qué la puedo ayudar?" },
  { id: "2", who: "cliente", time: "10:41", text: "Hola, quisiera agendar una hora con un médico general, por favor." },
  { id: "3", who: "ejecutivo", time: "10:42", text: "Tengo hora el lunes a las 10. ¿Le sirve?", original: "Tendría disponibilidad el lunes 24 a las diez de la mañana, ¿le acomoda ese horario?" },
];

export default function Design() {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
  }

  return (
    <main>
      <header className="app">
        <Logo size={44} />
        <Button variant="secondary" onClick={toggle}>{theme === "dark" ? "Ver tema Pastel" : "Ver tema Noche"}</Button>
      </header>
      <h2>Marca</h2>
      <div className="pu-chips" style={{ alignItems: "center" }}>
        <Logo variant="mark" size={56} />
        {iconNames.map((n) => <Icon key={n} name={n} size={28} label={n} />)}
      </div>
      <h2>Acciones</h2>
      <div className="pu-chips">
        <Button icon="enviar">Decir</Button>
        <Button variant="secondary" icon="escribir">Escribir</Button>
        <Button variant="ghost">Cancelar</Button>
        <Button size="lg" icon="llamar">Llamar</Button>
        <Button size="lg" variant="danger" icon="colgar">Colgar</Button>
      </div>
      <h2>Llamada</h2>
      <div className="pu-chips">
        <CallStatus state="idle" />
        <CallStatus state="ringing" />
        <CallStatus state="connecting" />
        <CallStatus state="live" seconds={197} />
        <CallStatus state="ended" />
      </div>
      <VisualAlert tone="incoming" message="Te está llamando Clínica Santa María" action={<Button variant="secondary">Contestar</Button>} />
      <VisualAlert tone="success" message="Llamada conectada" />
      <VisualAlert message="Revisa tu conexión" />
      <VisualAlert tone="error" message="Se cortó la llamada. Toca Llamar para intentar de nuevo." />
      <h2>Conversación</h2>
      <Subtitles lines={EJEMPLO} showOriginal otherName="Clínica" />
      <Composer defaultValue="Sí, el lunes me sirve">
        <QuickReplies options={["Sí", "No", "Repita, por favor"]} />
      </Composer>
      <h2>Señas</h2>
      <div className="pu-chips">
        <GlossChip gloss="YO" />
        <GlossChip gloss="QUERER" confidence={0.92} />
        <GlossChip gloss="HORA" state="active" />
        <GlossChip gloss="LUNES" state="pending" />
      </div>
      <SignCamera
        glosses={["YO", "QUERER", "HORA", "LUNES"]}
        confidence={0.86}
        actions={<div className="pu-chips"><Button icon="enviar">Decir</Button><Button variant="secondary">Borrar</Button></div>}
      />
      <SignAvatar signing subtitle="Tengo hora el lunes a las 10. ¿Le sirve?" />
    </main>
  );
}
