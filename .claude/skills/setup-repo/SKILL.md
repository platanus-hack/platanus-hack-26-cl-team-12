---
name: setup-repo
description: 'Úsala para armar o auditar un repositorio del equipo con versionamiento semántico, ambientes dev y producción, protección de ramas (nadie hace push directo a main), GitHub Actions de CI/CD y seguridad, usando solo herramientas de costo 0 y dejando un registro de costos futuros. También cuando se cree un repo nuevo (front, back, infra) o alguien pregunte por el flujo de ramas, releases o deploys.'
---

# Setup de repositorio: 4 personas en paralelo, costo 0

## Principios
1. **Nadie hace push directo a `main` ni a `dev`.** Todo entra por Pull Request con CI verde y al menos 1 aprobación.
2. **Dos ambientes**:
   - `development`: se despliega automáticamente al hacer merge a `dev`.
   - `production`: se despliega al hacer merge de `dev` a `main`.
3. **Versionamiento**: SemVer y Conventional Commits. `release-please` genera el CHANGELOG y el tag, gratis.
4. **Costo 0 hoy, con visibilidad del costo mañana**: cada herramienta queda registrada en `docs/COSTOS.md` con su límite gratuito.
5. Aplicar a **cada repo** del equipo (front, back, etc.) con la misma configuración, parametrizada por stack.

## Flujo de ramas

```
feature/<issue>-slug ─┐
fix/<issue>-slug ─────┼─PR (CI + 1 review, squash)──▶ dev ──PR release (CI + 1 review)──▶ main ──▶ tag vX.Y.Z
chore/… docs/… ───────┘                               │                                       │
                                                  deploy dev                              deploy prod
hotfix/<slug> ──PR──▶ main  (luego merge main → dev)
```

- `dev` es la rama por defecto (ya lo es en `rlabbev/hackaton_test`).
- Ramas cortas, de menos de 1 día. Un PR por issue, con `Closes #N` en la descripción.
- Squash merge en los PRs hacia `dev`: el título del PR es el commit convencional (`feat(api): ...`).
- PR de release `dev → main` con merge commit, para no perder la historia. Para redactar el PR y el mensaje de merge, usar la skill `pr-hackaton`.
- Las rulesets **no** exigen historia lineal en `dev` ni en `main`. El back-merge `main → dev` necesita un merge commit, y `required_linear_history` lo rechazaría. Hacerlo con squash o rebase tampoco sirve: `dev` y `main` divergen y cada release vuelve a traer conflictos. El squash hacia `dev` queda como convención del equipo, y `pr-hackaton` avisa cuando alguien pide merge commit en una rama `feature/*`.

## Procedimiento

### Paso 0: diagnóstico (no cambia nada)
```bash
gh repo view OWNER/REPO --json visibility,defaultBranchRef,isPrivate
gh api repos/OWNER/REPO --jq .permissions         # se necesita admin:true
gh api repos/OWNER/REPO/rulesets                   # reglas existentes
ls package.json pyproject.toml go.mod 2>/dev/null  # detectar stack
ls .github/ 2>/dev/null                            # plantillas/workflows existentes
```
Informa al usuario qué encontraste antes de modificar nada.

### Paso 1: decisión sobre la protección de ramas (⚠️ límite del plan gratuito)
En **GitHub Free**, las *rulesets* y la *branch protection*, los *required reviewers* de Environments, CodeQL y el *push protection* de secretos **solo funcionan en repos públicos**. En repos privados requieren GitHub Pro, Team o Enterprise. Confírmalo en la documentación vigente (https://docs.github.com/en/get-started/learning-about-github/githubs-plans) porque los planes cambian.

**Pregunta al usuario** cuál opción toma:

| Opción | Costo | Protección real de main |
|--------|-------|-------------------------|
| A. Hacer el repo **público** | 0 | ✅ Rulesets, Environments con aprobación, CodeQL, secret push protection, Actions ilimitado |
| B. **GitHub Education** (Student Developer Pack incluye Pro) para el dueño del repo | 0 si es estudiante | ✅ en repos privados del dueño |
| C. Privado en Free + **enforcement suave** | 0 | ⚠️ Disuasivo: el workflow `guard-main.yml` detecta y alerta pushes directos, más un hook `pre-push` local y CODEOWNERS |

Con A o B, aplica las rulesets (después de agregar el job del stack a los checks requeridos, ver Paso 2):
```bash
gh api -X POST repos/OWNER/REPO/rulesets --input .claude/skills/setup-repo/templates/github/ruleset-main.json
gh api -X POST repos/OWNER/REPO/rulesets --input .claude/skills/setup-repo/templates/github/ruleset-dev.json
```
Si la API responde 403 con "Upgrade to GitHub Pro or make this repository public", estás en el caso C. Instala igual `guard-main.yml` (con A o B también sirve como auditoría).

Con C, además deja el hook local en `.githooks/pre-push`:
```bash
#!/usr/bin/env bash
branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "$branch" == "main" || "$branch" == "dev" ]]; then
  echo "❌ Push directo a $branch bloqueado. Usa una rama y abre un PR."; exit 1
fi
```
Cada persona lo activa con `git config core.hooksPath .githooks`.

### Paso 2: copiar plantillas
Desde `.claude/skills/setup-repo/templates/`:

| Plantilla | Destino | Para qué |
|-----------|---------|----------|
| `workflows/ci.yml` | `.github/workflows/ci.yml` | Lint, typecheck, tests y build en cada PR (ajustar al stack) |
| `workflows/security.yml` | `.github/workflows/security.yml` | gitleaks, osv-scanner y Semgrep CE |
| `workflows/pr-title.yml` | `.github/workflows/pr-title.yml` | Exige un título de PR convencional |
| `workflows/deploy.yml` | `.github/workflows/deploy.yml` | Deploy a `development` (dev) y `production` (main), solo con CI verde |
| `workflows/release-please.yml` | `.github/workflows/release-please.yml` | Versión, CHANGELOG y tag automáticos en main |
| `workflows/guard-main.yml` | `.github/workflows/guard-main.yml` | Detecta commits en main/dev que no vienen de un PR |
| `workflows/costos-mensual.yml` | `.github/workflows/costos-mensual.yml` | Abre un issue mensual de revisión de costos |
| `github/dependabot.yml` | `.github/dependabot.yml` | Actualizaciones de dependencias y de actions |
| `github/CODEOWNERS` | `.github/CODEOWNERS` | Reviewers automáticos (poner los usuarios del equipo) |
| `github/pull_request_template.md` | `.github/pull_request_template.md` | Checklist de PR. **Si el repo ya tiene una plantilla, no la sobrescribas: fusiona los ítems que falten** |
| `COSTOS.md` | `docs/COSTOS.md` | Registro de costos actuales y futuros |

Agrega también `.env.example`, `SECURITY.md` y `CONTRIBUTING.md` (con el flujo de ramas de arriba).

**Ajustes obligatorios después de copiar:**
- **Checks requeridos del stack.** Las rulesets traen `gitleaks`, `semgrep` y `conventional`. Agrega el job del stack (`node` o `python`) a `required_status_checks` en ambos JSON; si no, los tests no bloquean el merge.
- **Deploy con CI verde.** `deploy.yml` corre con `workflow_run` cuando `ci` termina con éxito en un push a dev o main. Nunca despliega un commit con CI rojo, ni siquiera en el caso C.
- **Token de release-please.** Los PRs creados con `GITHUB_TOKEN` no disparan workflows, así que con rulesets el PR de release nunca tendría checks. Crea un *fine-grained PAT* (gratis) o un GitHub App token con permisos *Contents* y *Pull requests* de lectura y escritura solo en este repo. Guárdalo con `gh secret set RELEASE_PLEASE_TOKEN`. El usuario debe crearlo en la UI; no lo generes ni lo pidas por chat.
- **Back-merge después de cada release.** El commit de release (CHANGELOG y versión) queda en `main`. Abre un PR `main → dev` (`chore: back-merge release vX.Y.Z`) para que el siguiente release no tenga conflictos.
- **Labels.** Los workflows crean `type:seguridad` y `type:costos` si no existen. Para el set completo, corre `workflow-kanban setup`.

### Paso 3: ambientes
```bash
gh api -X PUT repos/OWNER/REPO/environments/development
gh api -X PUT repos/OWNER/REPO/environments/production
```
- Los secretos van **por ambiente**: `gh secret set DATABASE_URL --env production`. Dev y prod **nunca** comparten BD ni credenciales (ver skill `seguridad-datos-cl`).
- Con las opciones A o B, en `production` se agrega *required reviewers* y restricción de deployment branch a `main`:
  ```bash
  gh api -X PUT repos/OWNER/REPO/environments/production --input - <<'EOF'
  {"reviewers":[{"type":"User","id":<USER_ID>}],
   "deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}
  EOF
  gh api -X POST repos/OWNER/REPO/environments/production/deployment-branch-policies -f name=main
  ```

### Paso 4: hosting gratuito (elegir según el stack)
Consultar `docs/COSTOS.md`. Sugerencias típicas de costo 0:
- **Front**: Vercel Hobby (⚠️ uso no comercial), Cloudflare Pages o GitHub Pages (estático).
- **Back**: Render free (se duerme con inactividad) o Cloud Run (free tier mensual, requiere tarjeta).
- **BD**: Supabase free (se pausa por inactividad) o Neon free.

Un proyecto o rama de BD por ambiente. El job de deploy en `deploy.yml` se deja con el comando del proveedor elegido; con integración Git del proveedor (Vercel/Render), el workflow solo valida y el proveedor despliega por rama.

### Paso 5: verificar
- Abre un PR de prueba: deben correr `ci`, `security` y `pr-title`.
- Intenta `git push origin main` desde una rama local: debe fallar (A/B) o generar una alerta de `guard-main` (C).
- Registra en `docs/COSTOS.md` cada servicio activado.

## Seguimiento de costos futuros
- `docs/COSTOS.md` es la fuente de verdad: herramienta, plan, límite gratis, qué dispara un cobro, cómo monitorear, alternativa y fecha de la última verificación.
- `costos-mensual.yml` abre el día 1 de cada mes un issue con checklist para revisar el consumo.
- Actions en repos privados: 2.000 min/mes gratis en Free. Consumo:
  ```bash
  gh api /users/OWNER/settings/billing/usage
  ```
  O en la UI: Settings → Billing. Para ahorrar minutos: `concurrency` con `cancel-in-progress`, `paths-ignore` para docs y cache de dependencias (ya incluidos en las plantillas).
- **Regla**: ningún servicio nuevo con tarjeta asociada sin agregarlo a COSTOS.md y sin poner una alerta o límite de gasto en el proveedor.

## Buenas prácticas incluidas
- Actions con `permissions:` mínimos por job (principio de mínimo privilegio, OpenSSF).
- Las actions **de terceros** van fijadas por SHA de 40 caracteres, con la versión en un comentario. Dependabot (`github-actions`) propone los bumps. Las oficiales `actions/*` pueden ir por versión mayor. Para tokens, preferir un GitHub App token o un fine-grained PAT de un solo repo; nunca un PAT clásico.
- `concurrency` para no gastar minutos en commits reemplazados.
- Conventional Commits para trazabilidad y SemVer automático.
