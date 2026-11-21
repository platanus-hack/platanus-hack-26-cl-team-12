# ADR-0008: Monorepo TypeScript (pnpm + Turborepo) y backend Python

## Estado
Propuesto

## Contexto
El sistema mezcla cliente TypeScript (ADR-0007) y backend con ML y agentes (ADR-0002, ADR-0004,
ADR-0005), cuyo ecosistema natural es Python. Hay piezas compartidas, como el diccionario de glosas
(ADR-0001), y 4 personas trabajando en paralelo.

## Decisión
Un único repositorio con esta estructura:
```
apps/
  web/        React + TS (PWA)
  mobile/     Capacitor (envuelve web/)
  desktop/    Tauri (opcional)
packages/
  ui/         componentes accesibles compartidos
  signs/      MediaPipe + inferencia ONNX
  avatar/     Three.js + VRM
  glosses/    diccionario de glosas + tipos (fuente única de verdad)
services/
  agent/      Python — LiveKit Agents + STT/LLM/TTS
  api/        Python — FastAPI (tokens, diccionario, usuarios)
ml/
  training/   notebooks y scripts de entrenamiento del clasificador
docs/adr/
```
- **JS/TS:** pnpm workspaces + Turborepo.
- **Python:** `uv` para dependencias y entornos virtuales.
- **Contrato compartido:** el diccionario se define en `packages/glosses` como JSON + JSON Schema; los
  tipos TS y los modelos Pydantic se generan o validan contra el mismo schema.

## Consecuencias

### Positivas
- Cambios atómicos entre cliente y backend (por ejemplo, una nueva glosa en un solo PR).
- Cada integrante tiene una carpeta clara, con menos conflictos de merge.
- El mismo schema evita que TS y Python se desincronicen.

### Negativas
- Dos ecosistemas de tooling (pnpm y uv) en el mismo repo.
- La CI debe detectar qué parte cambió para no correr todo siempre.

### Neutrales
- Se usará una sola configuración de lint por lenguaje (ESLint/Prettier y Ruff).

## Alternativas consideradas

**Backend 100 % TypeScript (Node)**
- Rechazada: el entrenamiento ML y los plugins de agentes son más maduros en Python.

**Repos separados (frontend / backend / ml)**
- Rechazada: coordinación costosa en una hackathon y el contrato de glosas quedaría duplicado.

**Nx en vez de Turborepo**
- Rechazada: más potente, pero con más configuración de la que se necesita.

## Referencias
- pnpm workspaces, Turborepo, uv
- ADR-0001, ADR-0007
