# Plan de trabajo (4 personas, mínimo choque)

> Propuesta. Las personas asignadas son una sugerencia: cámbienlas, pero mantengan **un dueño por carpeta**.
> Arquitectura y decisiones: `docs/adr/`. Contrato de mensajes: `docs/contrato.md`.

## 1. Cómo evitamos chocar (las 5 reglas)
1. **Un dueño por carpeta.** Solo el dueño edita su carpeta; si otro necesita un cambio, lo pide en la bitácora o hace un PR de ≤ 20 líneas y avisa.
2. **Contratos congelados en el Bloque 0.** Nadie programa contra algo que puede cambiar: `packages/glosses` (vocabulario + tipos del contrato), la interfaz `SignPlayer`, la interfaz `Classifier` y la clase `Translator`. Después de congelar, los cambios son **solo aditivos** (agregar glosas al final, nunca reordenar `classifierLabel`).
3. **Todos trabajan con mocks desde el minuto 1.** Cada pieza trae su simulador (ver §4), así nadie depende de que otro termine.
4. **Cada pantalla es un componente propio.** `apps/web/src/app/page.tsx` solo lo toca D; los demás entregan componentes en sus carpetas (`CallPanel`, `CameraPanel`, `AvatarPanel`) y rutas aparte (`/captura`).
5. **Archivos compartidos = commit chico y aparte, con pull justo antes:** `package.json` raíz, `pnpm-lock.yaml` (si hay conflicto: `pnpm install` y se regenera), `.env.example`, `docs/contrato.md`. Cada servicio Python tiene su propio `uv.lock`.

## 2. Reparto (una rama por persona, como en `ONBOARDING.md`)

| | Persona (sugerida) | Rama | Es dueño de | Entrega |
|---|---|---|---|---|
| **A** | Tomás (ya hizo la investigación y es quien despliega) | `v1-telefonia` | `services/api/`, `services/agent/telefonia/`, `.github/`, Dockerfiles, deploy, `.env` | Llamada telefónica real de punta a punta y todo desplegado |
| **B** | Raimundo | `v2-llm` | `services/agent/translator/`, `services/agent/agent.py`, `packages/glosses/data/`, `data/vocab/`, `data/eval/` | Traducción simple/compleja + voz + vocabulario del escenario |
| **C** | Martín | `v3-vision` | `packages/signs/`, `ml/training/`, `apps/web/src/app/captura/` | Cámara → glosas con vocabulario cerrado |
| **D** | Rafael | `v4-avatar` | `apps/web/` (shell), `packages/avatar/`, `packages/ui/`, `apps/mobile/`, clips | App usable, reproductor de señas y PWA instalable |

Entrega final (`platanus-hack-project.jsonc`, `project-description.md`, logo, guion de la demo): **A** la arma, **todos** revisan.

## 3. Requerimientos por persona
Tamaño: **S** ≤ 1 h · **M** 2–4 h · **L** medio día o más. Hecho = cumple el criterio y tiene `pytest`/`typecheck` en verde.

### Bloque 0 — Alineación (los 4 juntos, ~45 min, antes de programar)
| ID | Qué | Criterio |
|---|---|---|
| R0.1 | Elegir **un escenario** (hora médica **o** banco) | Decidido y anotado en `docs/plan.md` |
| R0.2 | Congelar **~30 glosas** del escenario (con una persona que conozca LSCh si es posible) | `glosses.json` commiteado por B |
| R0.3 | Repartir carpetas y ramas (§2) y acordar canal privado para claves | Todos con rama creada |
| R0.4 | **A entrega credenciales** de LiveKit y Twilio por canal privado (esto es lo único que bloquea a otros: hacerlo primero) | Cada uno con su `.env` |

### A — Telefonía y plataforma (v1) · no depende de nadie
| ID | Requerimiento | Tam. | Criterio de aceptación |
|---|---|---|---|
| A1 | Proyecto LiveKit Cloud + número Twilio + trunk SIP saliente/entrante | M | Llamas a un celular y entra a una sala |
| A2 | `POST /llamadas` real (`CreateSIPParticipant`) con `ALLOWED_DESTINATIONS` | M | Suena el celular y su audio llega a la sala |
| A3 | Despliegue: API + agente (Docker en Render/Fly) y PWA (Vercel desde el repo personal) | M | URL pública con HTTPS (la cámara lo exige) |
| A4 | Seguridad básica: `/token` con sesión o clave de demo, firmar sala para `/llamadas`, CORS de producción | S | Se cierran los `TODO(auth)` |
| A5 | CI verde en PRs; secretos solo en variables del proveedor | S | `ci.yml` pasa en `main` |
| A6 | Entrega: metadata, descripción, logo 1000×1000, guion y ensayo de la demo | M | Archivos del concurso completos |

### B — LLM, voz y vocabulario (v2) · no depende de nadie
| ID | Requerimiento | Tam. | Criterio de aceptación |
|---|---|---|---|
| B1 | Vocabulario: extraer glosas de los PDFs a `data/vocab/glosario.jsonl` y generar `glosses.json` | M | Schema válido; ≥ 30 glosas del escenario |
| B2 | Prompts de `simplificar` y `glosas_a_espanol` afinados al escenario + **15 casos** de prueba en `data/eval/` | M | Casos pasan una revisión humana |
| B3 | STT (Deepgram es, 8 kHz) y **mini-benchmark** con 10 frases chilenas por teléfono | M | Tabla de errores y latencia en `data/research/` |
| B4 | TTS ElevenLabs con **voz chilena elegida** (`ELEVENLABS_VOICE_ID`) y pronunciación de "Buk", "RUT", etc. | S | Se escucha natural en la demo |
| B5 | `complejizar` el texto del cliente (hoy pasa directo) y `espanol_a_glosas` publicando `glosas_para_senar` | M | El agente emite ambos mensajes del contrato |
| B6 | Latencia: streaming y medición STT→LLM→TTS | S | < 3 s por turno medido y anotado |

### C — Visión (v3) · riesgo alto, empieza ya
| ID | Requerimiento | Tam. | Criterio de aceptación |
|---|---|---|---|
| C1 | Extracción de puntos con MediaPipe (manos + pose) en el navegador, con simulador de teclado | M | Ves los puntos en pantalla a ≥ 15 fps en un celular |
| C2 | Página `/captura`: grabar muestras **solo de puntos clave** con consentimiento, etiquetadas por glosa | M | Exporta JSON por seña |
| C3 | **Sesiones de grabación del dataset** (30 glosas × ~20 repeticiones × ≥ 3 personas): **los 4 se turnan** | L | ≥ 600 muestras |
| C4 | Entrenar LSTM/GRU pequeño en Colab y exportar `.onnx` | M | ≥ 85 % top-1 en `data/eval/` |
| C5 | `Classifier` con `onnxruntime-web` + segmentación por pausa + umbral de confianza | M | Emite `glosas_cliente` con confianza |
| C6 | **Plan de reserva:** si C4 no llega, teclado de glosas por botones (mismo mensaje del contrato) | S | La demo funciona igual |

### D — Frontend, avatar y móvil (v4) · no depende de nadie
| ID | Requerimiento | Tam. | Criterio de aceptación |
|---|---|---|---|
| D1 | Shell accesible: layout, subtítulos grandes, avisos visuales, WCAG 2.2 AA (revisar con `a11y-debugging`) | M | Auditoría sin errores críticos |
| D2 | Pantalla de llamada: `CallPanel` + modo `?mock=1` que simula `ejecutivo_dice` sin LiveKit | M | Se ve la conversación sin backend |
| D3 | Escribir al ejecutivo (`cliente_dice`) con botones rápidos de sí/no | S | El agente lo recibe |
| D4 | `ClipSignPlayer` y **grabación/edición de clips** de las ~30 glosas (fondo neutro, buena luz) | L | Se encadenan sin saltos |
| D5 | `AvatarPanel`: reproduce `glosas_para_senar` + subtítulo | M | Una frase del ejecutivo se ve firmada |
| D6 | PWA instalable (manifest, íconos, offline del diccionario) y prueba en Android/iOS; Capacitor solo si sobra tiempo | M | Instala en el celular de la demo |
| D7 | Integración de `CameraPanel` (de C) en `page.tsx` | S | Todo en una sola pantalla |

## 4. Mocks que evitan las esperas
| Si necesitas… | Úsalo así | Lo mantiene |
|---|---|---|
| Un ejecutivo que habla | `?mock=1` en la web o un archivo `.wav` en el agente | D / B |
| Glosas del cliente | Teclado de glosas (también es el plan de reserva C6) | C |
| LiveKit | Pruebas unitarias con cliente falso (`FakeMessages`); LiveKit real solo en la integración | A |
| Clips o avatar | `ClipSignPlayer` con clips placeholder; el subtítulo se muestra siempre | D |

## 5. Orden y puntos de sincronización
```
Bloque 0  Alineación (R0.1–R0.4)                       → todos, ~45 min
Bloque 1  A1–A3 · B1–B4 · C1–C2 · D1–D3, en paralelo    → sin dependencias entre personas
Sync 1    Integración v1: llamada real con subtítulos   → A + D + B (la rama más corta mergea primero)
Bloque 2  A4–A5 · B5–B6 · C3–C5 · D4–D6                 → sesiones de grabación C3 con los 4
Sync 2    v2 y v3 integrados                            → B + C + D
Bloque 3  Congelar funcionalidades, A6, ensayo ×3       → todos; solo bugs y pulido
```
Orden sugerido de merge a `main`: **A → B → D → C** (los que más servicios comparten primero, visión al final porque es lo más riesgoso y no debe bloquear nada).

## 6. Dependencias reales (solo hay tres)
| Quién espera | A quién | Qué | Cuándo |
|---|---|---|---|
| B, C, D | A | Credenciales (R0.4) | Bloque 0 |
| C y D | B | Lista congelada de glosas (R0.2) | Bloque 0 |
| D | C | `CameraPanel` | Sync 2 (D usa el teclado de glosas mientras tanto) |

## 7. Plan de recorte (qué soltamos si falta tiempo, en este orden)
1. Capacitor, Tauri y offline (D6): queda PWA instalable.
2. Avatar 3D: queda `ClipSignPlayer` (ya es el plan principal).
3. Reconocimiento con cámara (C4–C5): queda el teclado de glosas (C6) y se dice abiertamente que v3 es prototipo.
4. Vocabulario: de 30 a ~15 glosas.

**Lo que no se recorta:** v1 (llamada real con texto) y v2 (simplificar/complejizar). Son el valor y lo más seguro de demostrar.
