"use client";

import { useId, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";

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
  /** Versión de una línea para dejar fija abajo durante la llamada (sin etiqueta visible ni ayuda). */
  compact?: boolean;
  /** Tope de caracteres (el del contrato, `LIMITES.max_texto`): sobre eso el mensaje se descartaría en el agente. */
  maxLength?: number;
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
  hint = "Bridge lo dice por teléfono con voz.",
  sendLabel = "Decir",
  compact = false,
  maxLength,
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
    <form className={compact ? "pu-composer compact" : "pu-composer"} onSubmit={send}>
      {children}
      <label htmlFor={id} className={compact ? "pu-sr" : undefined}>
        {label}
      </label>
      <textarea
        rows={compact ? 1 : undefined}
        id={id}
        value={text}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => set(e.target.value)}
        onKeyDown={(e) => {
          // isComposing: teclados que "componen" la palabra (Samsung, japonés…) no deben mandar el mensaje a medias.
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) send(e);
        }}
      />
      {compact ? (
        <button type="submit" className="pu-send" aria-label={sendLabel} disabled={sending || !text.trim()}>
          <Icon name="enviar" size={22} />
        </button>
      ) : (
        <div className="bar">
          <span className="hint">{hint}</span>
          <Button type="submit" icon="enviar" disabled={sending || !text.trim()}>
            {sending ? "Hablando…" : sendLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
