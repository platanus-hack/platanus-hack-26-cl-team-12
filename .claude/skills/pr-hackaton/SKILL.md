---
name: pr-hackaton
description: Plantilla y flujo de Pull Requests del equipo del hackatón. Úsala SIEMPRE que alguien pida crear, abrir, preparar, describir, revisar o mergear un PR / pull request en este repo, o pida un mensaje de merge commit. Rellena la plantilla del repo, recomienda publicarla como descripción/comentario del PR y, si se va a hacer merge commit, redacta el mensaje con resumen de qué se hizo y por qué, más advertencias si algo del merge se ve extraño. En este repo tiene prioridad sobre pr-comment.
---

# PR del hackatón

Dos modos:

- **`crear`** (por defecto): alguien quiere abrir o describir un PR.
- **`merge <n>`**: alguien quiere mergear el PR `<n>` con merge commit, o pregunta cómo mergearlo.

Nunca publiques, edites ni mergees nada en GitHub sin que la persona lo confirme explícitamente. Prepara todo, muestra el texto y pregunta.

## Modo `crear`

1. Reúne contexto:
   ```bash
   git fetch origin
   git branch --show-current
   git log --oneline origin/dev..HEAD          # o la base que corresponda
   git diff --stat origin/dev...HEAD
   gh pr view --json number,title,body,baseRefName,url 2>/dev/null   # ¿ya existe el PR?
   ```
2. Define la base: `feature/*`, `fix/*` y `chore/*` van a `dev`. Solo `dev` (o la rama de release) va a `main`. Si alguien apunta una rama de feature a `main`, adviértelo antes de seguir.
3. Rellena `.github/pull_request_template.md` con lo que muestran el diff y los commits. No inventes: si no sabes cómo se verificó o qué issue cierra, pon `⚠️ completar` y pregúntalo.
4. Propón un título en Conventional Commits: `tipo(alcance): resumen`. El workflow de títulos de PR lo exige y release-please lo usa para el CHANGELOG.
5. **Recomienda siempre publicar la descripción en el PR**. Muestra el texto y ofrece el comando:
   - PR nuevo: `gh pr create --base dev --title "<título>" --body-file <archivo>`
   - PR existente sin descripción: `gh pr edit <n> --body-file <archivo>`. Si falla con `Projects (classic) is being deprecated`, es un bug de versiones antiguas de `gh` (por ejemplo la 2.45 de Ubuntu). Usa la API REST, que hace lo mismo:
     ```bash
     gh api -X PATCH repos/{owner}/{repo}/pulls/<n> -F body=@<archivo> --jq .html_url
     ```
   - PR existente que ya tiene descripción: `gh pr comment <n> --body-file <archivo>`, para no pisar lo que escribió otra persona.

   Guarda el texto en un archivo temporal fuera del repo para no commitearlo por error.

## Modo `merge <n>`

### 1. Recomendación de estrategia

Para ramas `feature/*` recomienda **squash**: deja un commit limpio por tarea en `dev`. El merge commit tiene sentido en `dev → main` (release) y `main → dev` (back-merge). Si piden merge commit en otro caso, hazlo, pero dilo.

### 2. Revisa si hay algo extraño

Corre las comprobaciones y junta las advertencias:

```bash
gh pr view <n> --json baseRefName,headRefName,isDraft,mergeable,mergeStateStatus,reviewDecision,commits,files,additions,deletions
gh pr checks <n>
gh api repos/{owner}/{repo}/rules/branches/<base> --jq '.[].type'
```

| Señal | Advertencia |
|---|---|
| `required_linear_history` en las reglas de la base | ❌ GitHub va a rechazar el merge commit. Usa squash o rebase. |
| Checks fallando o pendientes | ❌ No mergear hasta que el CI esté verde. |
| `mergeable: CONFLICTING` o `mergeStateStatus: DIRTY/BEHIND` | ⚠️ Hay conflictos o la rama está atrasada. Actualizarla primero. |
| `isDraft: true` o `reviewDecision` distinto de `APPROVED` | ⚠️ PR en borrador o sin aprobación. |
| Base `main` y head distinto de `dev`, release o `hotfix/*` | ⚠️ Se salta `dev`. Cambios sin probar llegarían a producción. |
| Base `dev` y head `main` | ℹ️ Back-merge después de un release. Es esperado. |
| Commits que no siguen Conventional Commits (`wip`, `arreglos`, `asdf`) | ⚠️ Con merge commit cada commit llega al historial y release-please los lee uno por uno. Mejor squash. |
| Commits `fixup!`/`squash!`, o varios `Merge branch 'dev' into …` | ⚠️ Historial ruidoso. Mejor squash. |
| Archivos `.env*`, `*.pem`, `*.key`, `*.sql`, `*.csv` o dumps en `files` | ❌ Posibles secretos o datos personales. Revisar con `seguridad-datos-cl` antes de mergear. |
| Más de unas 800 líneas cambiadas o más de 30 archivos | ⚠️ PR muy grande y difícil de revisar. Considerar partirlo. |
| Solo cambia el lockfile, o cambia sin que cambie `package.json` | ⚠️ Revisar que no sea un cambio accidental de dependencias. |
| No enlaza un issue (`Cierra #`) | ℹ️ El kanban no se actualiza solo. |

Si el merge commit se hace **en local** con resolución de conflictos, revisa también que no haya cambios que no vienen de ninguno de los dos padres (un "evil merge"):
```bash
git show --remerge-diff <sha-del-merge>
```
Cualquier cambio que aparezca ahí fuera de la resolución de conflictos es ❌ y se avisa.

### 3. Redacta el mensaje del merge commit

Usa `plantilla-merge-commit.md` en esta carpeta. El título **no** va en Conventional Commits. Así release-please no cuenta el cambio dos veces: ya lo cuentan los commits individuales del PR.

### 4. Muestra y pregunta

Muestra primero las advertencias (❌ arriba), después el mensaje, y al final el comando sin ejecutarlo:
```bash
gh pr merge <n> --merge --subject "<título>" --body-file <archivo>
```
Si hay algún ❌, recomienda **no** mergear y explica qué arreglar. Si la persona igual quiere seguir, deja la advertencia escrita en la sección "Advertencias" del mensaje, para que quede en el historial.

## Cierre obligatorio

Si existe `.claude/skills/_compartido/loop-engineering.md`, léelo. Termina siempre con una sección **🔁 Loops recomendados** de 1 a 3 entradas:

| Loop | Verificador | Cadencia | Para cuándo | Criterio del jurado que mueve |

Ejemplos para este modo: "CI rojo → corregir → push hasta checks verdes, máx. 3 intentos y después pedir ayuda", o "revisor responde comentarios del PR cada 1 h hasta aprobarlo".
