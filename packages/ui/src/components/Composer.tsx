"use client";

import { useId, useState, type ReactNode } from "react";
import { Button } from "./Button";

export interface ComposerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSend?: (text: string) => void;
  /** Mientras suena el TTS: deshabilita el botón y muestra "Hablando…". */
  sending?: boolean;
  label?: string;
  placeholder?: string;
  hint?: string;
  sendLabel?: string;
  children?: ReactNode;
}

/** Donde el cliente escribe. Enter envía, Shift+Enter hace salto de línea. */
export function Composer({
  value,
  defaultValue = "",
  onChange,
  onSend,
  sending = false,
  label = "Lo que quieres decir",
  placeholder = "Ej: Quiero una hora para el lunes",
  hint = "Puente lo dice por teléfono con voz.",
  sendLabel = "Decir",
  children,
}: ComposerProps) {
  const id = useId();
  const [inner, setInner] = useState(defaultValue);
  const text = value ?? inner;

  function set(v: string) {
    setInner(v);
    onChange?.(v);
  }
  function send(e?: { preventDefault(): void }) {
    e?.preventDefault();
    const t = text.trim();
    if (!t || sending) return;
    onSend?.(t);
    if (value == null) setInner("");
  }

  return (
    <form className="pu-composer" onSubmit={send}>
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        value={text}
        placeholder={placeholder}
        onChange={(e) => set(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) send(e);
        }}
      />
      {children}
      <div className="bar">
        <span className="hint">{hint}</span>
        <Button type="submit" icon="enviar" disabled={sending || !text.trim()}>
          {sending ? "Hablando…" : sendLabel}
        </Button>
      </div>
    </form>
  );
}
