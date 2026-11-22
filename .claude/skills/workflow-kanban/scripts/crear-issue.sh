#!/usr/bin/env bash
# Crea un issue SIN duplicar (por huella) y lo agrega al Project.
# Uso: crear-issue.sh OWNER/REPO PROJECT_NUM "clave-unica" "Título" "labels,coma,separadas" archivo_body.md
# La "clave-unica" identifica el hallazgo (p.ej. "todo:src/api/user.ts:validar rut" o "lint:no-unused-vars:src/x.ts").
# No incluyas número de línea en la clave: cambia con cada edición y generaría duplicados.
set -euo pipefail
REPO="$1"; NUM="$2"; KEY="$3"; TITLE="$4"; LABELS="$5"; BODY_FILE="$6"; OWNER="${REPO%%/*}"
FP="kfp$(printf '%s' "$KEY" | sha1sum | cut -c1-12)"

existing=$(gh issue list -R "$REPO" --state all --search "\"$FP\" in:body" --json number,state --jq '.[0] | select(.) | "\(.number) \(.state)"')
if [ -n "$existing" ]; then echo "DUPLICADO $existing ($KEY)"; exit 0; fi

# La huella va como texto visible (los comentarios HTML podrían no indexarse en la búsqueda).
body="$(cat "$BODY_FILE")

<sub>huella: $FP (no editar: evita duplicados del loop)</sub>"
url=$(gh issue create -R "$REPO" --title "$TITLE" --label "$LABELS" --body "$body")
gh project item-add "$NUM" --owner "$OWNER" --url "$url" >/dev/null
echo "CREADO $url"
