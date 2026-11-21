# Puente

**Llamadas telefónicas accesibles para personas sordas.**

Hoy, una persona sorda no puede resolver por sí sola trámites que solo se hacen por teléfono: pedir una hora médica, hablar con el banco o consultar un servicio del Estado. Depende de que alguien llame por ella.

## Cómo funciona
El **ejecutivo** llama por teléfono como siempre, sin instalar nada. El **cliente** (persona sorda) usa Puente en su celular. Lo construimos en cuatro versiones, cada una sobre la anterior:

1. **Voz ↔ texto:** lo que dice el ejecutivo aparece como texto; lo que escribe el cliente se le dice al ejecutivo con voz natural.
2. **Lenguaje simple:** un LLM simplifica lo que dice el ejecutivo (muchas personas sordas tienen un vocabulario escrito más acotado, porque el español es su segunda lengua) y convierte lo que escribe el cliente en una frase clara y cortés.
3. **Lengua de señas → voz:** el cliente firma frente a la cámara del celular, Puente lo reconoce y lo dice por teléfono.
4. **Voz → avatar de señas:** la voz del ejecutivo se muestra como lengua de señas y el cliente responde firmando.

## Tecnología
Twilio (telefonía en tiempo real), ElevenLabs (voz), LLM de Anthropic (simplificar y adaptar), MediaPipe (reconocimiento de señas), PWA en Next.js y backend FastAPI.

## Equipo
Martín Rosenfeld, Tomás Nusser, Rafael Rencoret y Raimundo Labbé — Track Physical World.
