"use client";

// Inicio de sesión de la demo: entra con cualquier usuario y contraseña (no vacíos).
// TODO(real-data): autenticación real cuando exista backend con usuarios.
import { useState, type FormEvent } from "react";
import { Logo } from "@puente/ui";
import { cambiarPreferencias } from "@/lib/preferencias";

export function Login() {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);

  function entrar(e: FormEvent) {
    e.preventDefault();
    if (!usuario.trim() || !clave) {
      setError("Escribe tu usuario y tu contraseña.");
      return;
    }
    cambiarPreferencias({ sesion: { usuario: usuario.trim() } });
  }

  return (
    <main className="login">
      <div className="login-marca">
        <Logo variant="mark" size={64} />
        <h1>Bridge</h1>
        <p>Llamadas por teléfono, en texto y lengua de señas.</p>
      </div>
      <form className="login-form" onSubmit={entrar} noValidate>
        <label htmlFor="login-usuario">Usuario o correo</label>
        <input id="login-usuario" autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="tu@correo.cl" />
        <label htmlFor="login-clave">Contraseña</label>
        <input id="login-clave" type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} />
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn-principal">
          Ingresar
        </button>
        <p className="nota centrada">Demo: entra con cualquier usuario y contraseña.</p>
      </form>
    </main>
  );
}
