# ADR-0011: Despliegue: Vercel (front) y contenedor Docker (agente)

## Estado
Propuesto

## Contexto
- El cliente web (ADR-0007) es estático o casi estático.
- El agente (ADR-0005) es un **proceso Python de larga duración** que mantiene conexiones WebRTC: no
  encaja en funciones serverless con timeout.
- La API (FastAPI) es liviana.
- El repo de la organización no puede conectarse directamente a Vercel o Render; según el README, hay que
  **espejar a un repo personal** y desplegar desde ahí.

## Decisión
- **Front (PWA):** **Vercel**, desplegado desde el repo espejo personal.
- **Agente + API:** **un contenedor Docker** (multi-stage, imagen `python-slim`, usuario no root) en
  **Render** o **Fly.io**. Fly.io tiene región en Santiago (`scl`), lo que reduce la latencia a LiveKit y
  a los usuarios; Render es más simple de configurar.
- **Secretos** (Claude, LiveKit, STT/TTS, Supabase) como variables de entorno del proveedor; nunca en el repo.
- **CI con GitHub Actions:** lint y tests por paquete afectado, más `hadolint` sobre el Dockerfile.
- **Entrenamiento ML** fuera del despliegue: Colab o Modal, con publicación del `.onnx` en Supabase Storage (ADR-0009).

## Consecuencias

### Positivas
- Cada pieza corre en la plataforma que mejor le acomoda.
- El contenedor es portable: se puede mover de Render a Fly.io, a Cloud Run o a una VM sin cambios.
- La región Santiago (Fly.io) ayuda a la meta de latencia.

### Negativas
- Tres o cuatro proveedores que administrar (Vercel, Render/Fly, LiveKit, Supabase).
- Los planes gratuitos pueden "dormir" el contenedor (arranque en frío); hay que mantenerlo despierto antes de la demo.

### Neutrales
- La configuración del espejo del repo es un paso manual inicial (ver el README raíz).

## Alternativas consideradas

**Todo en Vercel (incluido el agente en funciones)**
- Rechazada: las funciones serverless no sostienen conexiones WebRTC de larga duración.

**Kubernetes**
- Rechazada: sobreingeniería para el MVP.

**Una VM propia (EC2/GCE)**
- Rechazada: más operación manual (TLS, reinicios, actualizaciones) sin beneficio en el MVP.

## Referencias
- Vercel, Render, Fly.io, GitHub Actions, hadolint
- ADR-0005, ADR-0007, ADR-0008, ADR-0009
