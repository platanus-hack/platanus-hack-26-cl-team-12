---
name: criterios-evaluacion
description: 'Úsala al decidir qué construir o priorizar en la hackatón, al revisar un avance, antes de un checkpoint o de la demo final, o cuando alguien pregunte "¿cómo vamos?" o "¿qué nos falta para ganar?". Evalúa el proyecto contra los 5 criterios del jurado (Originalidad 15%, Ambición 20%, Ejecución 20%, Aspecto técnico 25%, Impacto 20%) y entrega un puntaje estimado con acciones concretas.'
---

# Criterios de evaluación de la hackatón

El jurado puntúa con esta rúbrica. **Toda decisión de alcance se justifica contra ella.**

| # | Criterio | Peso | Qué mira el jurado |
|---|----------|------|--------------------|
| 1 | Originalidad | 15% | Si la idea es sorprendente y novedosa, y si va más allá de la primera solución evidente o de un problema clásico |
| 2 | Ambición | 20% | Qué tan altos fueron los objetivos para las 36 horas |
| 3 | Ejecución | 20% | Si el resultado está pulido, es coherente y funciona, y cuánto se avanzó **durante** el evento |
| 4 | Aspecto técnico | 25% | La calidad de la ingeniería y del diseño (complejidad, modelación, adecuación). **Puede haber revisión automatizada del código** |
| 5 | Impacto | 20% | Valor **profundo** para usuarios reales, más que alcance superficial |

> Ambición y Ejecución pesan lo mismo y tiran en direcciones opuestas: lo ideal es un núcleo ambicioso que funcione de punta a punta, no diez features a medias.

## Modos de uso

### 1. `idea`: evaluar o afinar una idea (al inicio)
Responde por escrito, en `docs/PITCH.md`:
1. **Problema y usuario concreto.** Quién sufre el problema, con qué frecuencia y cuánto le cuesta hoy. Sin un usuario identificable, el Impacto baja.
2. **La primera solución evidente.** Escríbela explícitamente y después explica en qué se diferencia la de ustedes. Si no se diferencia, la Originalidad baja.
3. **Insight no obvio.** El dato, la técnica o el ángulo que otros equipos probablemente no tendrán.
4. **Ambición en 3 niveles**:
   - *Piso*: lo que seguro se demuestra.
   - *Meta*: lo que se planea.
   - *Moonshot*: lo que se muestra si sobra tiempo.
   El piso tiene que ser demostrable a las 24 h.
5. **Profundidad del valor.** Una métrica de antes y después (tiempo ahorrado, error evitado, dinero, riesgo).

### 2. `checkpoint`: autoevaluación durante el evento
Recorre la checklist de abajo, asigna un puntaje de 1 a 5 por criterio con **evidencia** (link a commit, archivo, demo) y calcula:

```
score = 0.15*O + 0.20*A + 0.20*E + 0.25*T + 0.20*I    (máx 5.0)
```

Entrega una tabla con el puntaje, la evidencia y **las 3 acciones con mayor ganancia de puntaje por hora invertida**. Guarda el resultado en `docs/checkpoints/AAAA-MM-DD-HHMM.md` para mostrar la evolución (sirve como evidencia de "cuánto se avanzó").

### 3. `pre-demo`: últimas 4 horas
Prioriza solo Ejecución y Técnico: congelar features, arreglar el camino feliz de la demo, completar el README y pasar el CI en verde.

## Checklist por criterio

### Originalidad (15%)
- [ ] La idea no es la de "chatbot genérico / to-do / marketplace" sin un giro.
- [ ] El pitch nombra explícitamente la solución obvia y por qué esta es distinta.
- [ ] Hay al menos un elemento técnico o de interacción que sorprende en la demo.

### Ambición (20%)
- [ ] Los objetivos (piso, meta, moonshot) están escritos en `docs/PITCH.md` con hora de registro.
- [ ] El sistema resuelve un problema difícil: integración real, datos reales, IA aplicada con criterio, tiempo real, etc.
- [ ] Se puede mostrar qué parte del moonshot se logró.

### Ejecución (20%)
- [ ] El flujo principal funciona de punta a punta en el ambiente desplegado, no solo en localhost.
- [ ] No hay pantallas rotas, *lorem ipsum* ni botones muertos en el camino de la demo.
- [ ] El historial de git muestra trabajo continuo **durante** el evento: commits frecuentes y PRs pequeños.
- [ ] Hay un guion de demo de 3 minutos ensayado y un plan B (video o datos seed).

### Aspecto técnico (25%), optimizado para revisión automatizada
El jurado puede pasar herramientas automáticas sobre el repo. Lo que esas herramientas suelen premiar:
- [ ] **README** con qué es, cómo correrlo en 1 comando, arquitectura y decisiones.
- [ ] **`docs/ARCHITECTURE.md`** con un diagrama (Mermaid) y el modelo de datos.
- [ ] **ADRs** (`docs/adr/NNNN-titulo.md`) para las 3–5 decisiones clave: por qué este stack, esta BD, este modelo.
- [ ] Separación de capas: dominio, infraestructura y UI, sin lógica de negocio en controladores o componentes.
- [ ] Tipado estricto (TS `strict`, mypy/pyright) y **lint sin errores**.
- [ ] **Tests** del núcleo de dominio y CI corriéndolos en cada PR.
- [ ] Sin secretos en el repo (gitleaks limpio) y `.env.example` documentado.
- [ ] Commits convencionales (`feat:`, `fix:`…) y PRs con descripción. Ver skills `setup-repo` y `pr-hackaton`.
- [ ] Manejo de errores y validación de entradas (zod/pydantic) en los bordes del sistema.
- [ ] Cumplimiento de datos personales. Ver skill `seguridad-datos-cl`. Es diferenciador frente al jurado.
- [ ] Sin código muerto, archivos generados ni `node_modules` versionados.

Antes de cada checkpoint, ejecuta lo que una revisión automatizada correría: lint, typecheck, tests, gitleaks y conteo de TODOs. Las fallas se registran como issues con la skill `workflow-kanban`.

### Impacto (20%)
- [ ] Hay un usuario o persona concreta, idealmente validada (una conversación real, un dato público).
- [ ] La demo muestra el **antes y el después** con una métrica.
- [ ] Se explica cómo se adoptaría: quién paga o quién lo usa mañana.
- [ ] Profundidad sobre amplitud: resuelve muy bien un caso en vez de superficialmente diez.

## Reglas al usar esta skill
- Puntúa con evidencia verificable en el repo; si no hay evidencia, el puntaje es ≤2.
- Sé honesto: el objetivo es encontrar brechas, no felicitar.
- Toda acción sugerida debe poder convertirse en un issue (con label `criterio:<nombre>`) para el kanban.
