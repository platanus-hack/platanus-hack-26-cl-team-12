---
name: workflow-kanban
description: 'Úsala para organizar el trabajo del equipo en un kanban de GitHub Projects. Crea el tablero, escanea el código en busca de problemas e ideas de mejora y los convierte en issues sin duplicados que cualquiera puede tomar. También explica el flujo diario: tomar una tarea, rama, PR y cierre. Pensada para correr periódicamente con /loop (p. ej. `/loop 30m /workflow-kanban scan`). Úsala cuando alguien pregunte "¿qué hago ahora?", "¿qué falta?", quiera reportar una idea o un bug, o quiera crear tareas.'
---

# Workflow de desarrollo y kanban

Objetivo: que **cualquiera de las 4 personas** pueda abrir el tablero, tomar la tarea de más arriba en **Ready** y avanzar sin pedir contexto.

## Modos
| Invocación | Qué hace |
|------------|----------|
| `/workflow-kanban setup` | Crea labels, el Project y sus campos, y lo vincula al repo (una vez) |
| `/workflow-kanban scan` | Escanea el repo y crea issues nuevos sin duplicar. **Este es el modo del loop** |
| `/workflow-kanban idea "<texto>"` | Convierte una idea o un problema en un issue bien escrito |
| `/workflow-kanban next [@usuario]` | Recomienda la próxima tarea según la prioridad y el WIP de cada uno |
| `/workflow-kanban flujo` | Explica el flujo de trabajo diario (ver abajo) |

## setup (una vez por repo)
1. Permisos de `gh`: `gh auth status`. Si falta el scope `project`, el usuario debe correr `gh auth refresh -s project`. Es interactivo, así que pídeselo; no lo ejecutes tú.
2. Ejecuta:
   ```bash
   .claude/skills/workflow-kanban/scripts/bootstrap-kanban.sh OWNER/REPO "Kanban Hackatón"
   ```
   El tablero queda a nombre del dueño del repo, para poder vincularlo.
3. En la UI del Project:
   - Vista **Board** agrupada por Status con columnas `Todo → Ready → In Progress → En revisión → Done`.
   - Activar los workflows integrados: *Auto-add to project* (filtro `is:issue,pr`), *Item closed → Done* y *Pull request merged → Done*.
   - Límite WIP de In Progress: 4, es decir, 1 por persona.
4. Guarda el número del Project en `CLAUDE.md` del repo (`Kanban: project #N de OWNER`) para no tener que buscarlo.

## scan: levantar problemas e ideas (modo loop)
Recolecta **señales**, prioriza y crea issues con `scripts/crear-issue.sh`, que deduplica por huella. **Nunca** crees issues con `gh issue create` directo en este modo.

### Fuentes, en orden de valor
1. **Criterios del jurado**: aplica la checklist de la skill `criterios-evaluacion`. Cada casilla sin cumplir es un issue con `criterio:<x>`. Clave: `criterio:<x>:<item>`.
2. **CI roto o lento**:
   ```bash
   gh run list -b dev -L 5 --json conclusion,name,url
   ```
   Si hay fallas, un issue `type:bug prio:P0`.
3. **Lint, typecheck y tests** locales: correr los mismos comandos del CI. Agrupa por regla y archivo, no por línea. Clave: `lint:<regla>:<archivo>`.
4. **Marcadores en el código**:
   ```bash
   git grep -nE "TODO|FIXME|HACK|XXX"
   ```
   Clave: `todo:<archivo>:<texto normalizado>`. No uses el número de línea, que cambia.
5. **Seguridad**:
   - `gitleaks git --redact`;
   - `osv-scanner -r .`;
   - `semgrep scan --config p/default`;
   - revisión rápida de la skill `seguridad-datos-cl`: inventario de datos, logs con datos personales, política de privacidad.
   Todo con `type:seguridad`. **Nunca pegues el secreto ni datos personales en el issue**; solo indica archivo y regla.
6. **Calidad de diseño (ideas de mejora)**: archivos de más de 400 líneas, funciones con mucha anidación, lógica de negocio en controladores o componentes, duplicación evidente, módulos sin tests, falta README, ARCHITECTURE o ADR. Usa `type:mejora` o `type:deuda-tecnica`.
7. **Ideas de producto**: 1 o 2 por scan como máximo, con `type:idea prio:P2`. Que sean concretas y que suban Originalidad o Impacto.

### Reglas del scan
- **Máximo 5 issues nuevos por ejecución.** Elige los de mayor impacto en el puntaje. Si hay más, menciónalos en el resumen sin crearlos.
- Antes de crear, revisa que no exista un issue abierto equivalente redactado por un humano:
  ```bash
  gh issue list -R OWNER/REPO --search "<palabras clave>"
  ```
- Labels obligatorios: un `type:*`, un `prio:*`, un `size:*` y el `origen:loop`. Agrega `criterio:*` si aplica y `good-first-task` si no requiere contexto.
- Prioridad:
  - **P0**: rompe la demo o el CI, o es un secreto expuesto.
  - **P1**: sube el puntaje de forma visible.
  - **P2**: el resto.
- Tamaño L: divídelo en issues S o M antes de crearlo.
- Al terminar, imprime un resumen: creados, duplicados omitidos y top 3 sugeridos para tomar ahora.

### Plantilla de issue (body)
```markdown
## Contexto
<qué se detectó y dónde: archivo/ruta, comando que lo evidencia>

## Por qué importa
<efecto en usuario / demo / criterio del jurado>

## Criterio de aceptación
- [ ] <verificable>
- [ ] Tests/CI en verde

## Pistas
<archivos a tocar, enfoque sugerido>
```

Ejemplo:
```bash
cat > /tmp/body.md <<'MD'
...plantilla rellena...
MD
.claude/skills/workflow-kanban/scripts/crear-issue.sh OWNER/REPO 3 \
  "todo:src/api/users.ts:validar rut" \
  "fix(api): validar RUT en registro de usuarios" \
  "type:bug,prio:P1,size:S,origen:loop,criterio:tecnico,good-first-task" /tmp/body.md
```

### Programarlo con /loop
- `/loop 30m /workflow-kanban scan`: cada 30 minutos durante la hackatón.
- O sin intervalo, `/loop /workflow-kanban scan`, para que Claude regule el ritmo.
- Una sola persona del equipo corre el loop. Así se evitan carreras, aunque la huella también protege contra duplicados.

## Flujo de trabajo diario (para las 4 personas)
1. **Tomar una tarea**: la de más arriba en *Ready* (P0 antes que P1). Asígnatela y muévela a In Progress:
   ```bash
   gh issue edit N --add-assignee @me
   ```
   Máximo 1 en curso por persona.
2. **Rama** desde `dev` actualizado:
   ```bash
   git switch dev && git pull && git switch -c feat/N-slug
   ```
   Prefijos: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`.
3. **Commits** pequeños y convencionales: `feat(api): ...`, `fix(ui): ...`.
4. **PR temprano** (draft si no está listo) hacia `dev`, con `Closes #N`. Muévelo a *En revisión* cuando pidas review. Para redactarlo, usar la skill `pr-hackaton`.
5. **Review**: otra persona revisa en menos de 30 minutos. Regla del equipo: revisar PRs antes de tomar tarea nueva.
6. **Merge** con squash cuando el CI está verde. El issue se cierra solo y pasa a Done.
7. **Algo descubierto en el camino**: no se arregla en el mismo PR. Se registra con `/workflow-kanban idea "..."`.

Ritmo sugerido de la hackatón:
- **Sync de 10 minutos cada 4 horas**: revisar el tablero, repriorizar con `/criterios-evaluacion checkpoint` y mover tareas a Ready.
- **PR de release `dev → main` en cada hito**, para tener siempre una versión demostrable en producción.

## next
Lee el tablero:
```bash
gh project item-list N --owner OWNER --format json
```
Filtra los items en Ready o Todo sin asignar, ordénalos por prioridad, `criterio:tecnico` y tamaño (los S primero si quedan pocas horas) y sugiere 1 a 3 tareas con su justificación.
