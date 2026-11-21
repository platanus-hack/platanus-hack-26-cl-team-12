# ADR-0004: Agente traductor LLM (Claude) con salida estructurada y vocabulario restringido

## Estado
Propuesto

## Contexto
Hay dos traducciones de lenguaje natural:
1. **Glosas → español chileno natural**: `YO MAÑANA MÉDICO IR` → "Mañana voy al médico".
2. **Español chileno → glosas LSCh**: simplificar (modismos como "al tiro", "¿cachai?", frases largas),
   reordenar según la gramática LSCh y usar **solo** señas que el avatar sabe ejecutar.

Las reglas son difíciles de programar a mano, el contexto conversacional importa (referentes como "eso"
o "él") y el resultado del sentido 2 debe ser consumible por máquina.

## Decisión
Usar **Claude** como agente traductor en el backend (ADR-0005):
- **Modelo:** `claude-haiku-5-5` en el camino de tiempo real (prioridad: latencia), con la opción de
  `claude-sonnet-5-5` para casos ambiguos o modo de alta calidad.
- **Prompt de sistema** con reglas de gramática LSCh, el diccionario de glosas vigente (ADR-0001) y
  ejemplos de pares español ↔ glosas del caso de uso. Se usa **prompt caching** para el bloque estático
  (reglas + diccionario).
- **Salida estructurada (tool use / JSON schema)** en el sentido español → glosas:
  ```json
  { "glosses": ["MAÑANA", "TÚ", "OFICINA", "VENIR"], "fingerspell": [], "subtitle": "Mañana ven a la oficina" }
  ```
- **Validación posterior**: toda glosa debe existir en el diccionario; si no, se reintenta una vez o se
  reemplaza por dactilología.
- **Memoria corta** de los últimos N turnos de la llamada para resolver referencias.
- **Streaming** en el sentido glosas → español, para empezar el TTS antes de que el LLM termine.

## Consecuencias

### Positivas
- Simplificación y reordenamiento de calidad sin escribir reglas a mano.
- El vocabulario cerrado más la validación impiden que el avatar reciba señas inexistentes.
- Agregar señas al diccionario mejora el sistema sin reentrenar ningún modelo.

### Negativas
- Dependencia de un proveedor externo y costo por token (bajo con Haiku y caching).
- Latencia de red agregada (~300 a 800 ms por turno, a medir).
- Riesgo de errores sutiles de traducción; requiere evaluación con intérpretes y un set de pruebas.

### Neutrales
- Se debe mantener un **set de evaluación** (pares español ↔ glosas validados) como test de regresión del prompt.

## Alternativas consideradas

**Reglas y plantillas escritas a mano**
- Rechazada: frágiles ante el lenguaje real y los modismos chilenos.

**Modelo de traducción entrenado (seq2seq)**
- Rechazada: no hay corpus paralelo español–LSCh suficiente.

**LLM open-source self-hosted**
- Rechazada para el MVP: requiere GPU y operación, y su calidad en español chileno es menor. Se puede reevaluar por costo o privacidad.

## Referencias
- Documentación de la API de Claude (tool use, prompt caching, streaming)
- ADR-0001, ADR-0005
