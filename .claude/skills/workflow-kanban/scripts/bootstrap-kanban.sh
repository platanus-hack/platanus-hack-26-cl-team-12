#!/usr/bin/env bash
# Crea labels + GitHub Project (v2) + campos, y lo vincula al repo. Idempotente.
# Uso: bootstrap-kanban.sh OWNER/REPO "Título del tablero"
# Requiere: gh auth refresh -s project
set -euo pipefail
REPO="${1:?OWNER/REPO}"; TITLE="${2:-Kanban Hackatón}"; OWNER="${REPO%%/*}"

label() { gh label create "$1" -R "$REPO" --color "$2" --description "$3" --force >/dev/null; echo "label $1"; }
label "type:bug"            d73a4a "Algo no funciona"
label "type:mejora"         a2eeef "Mejora de algo existente"
label "type:idea"           c5def5 "Idea nueva a evaluar"
label "type:deuda-tecnica"  fbca04 "Refactor, tests faltantes, TODO/FIXME"
label "type:seguridad"      b60205 "Seguridad o datos personales"
label "type:costos"         5319e7 "Costos de herramientas"
label "type:docs"           0075ca "Documentación"
label "prio:P0"             b60205 "Bloquea la demo"
label "prio:P1"             d93f0b "Importante para el puntaje"
label "prio:P2"             0e8a16 "Deseable"
label "size:S"              ededed "< 1 h"
label "size:M"              ededed "1-3 h"
label "size:L"              ededed "> 3 h: dividir"
label "good-first-task"     7057ff "Cualquiera la puede tomar sin contexto"
for c in originalidad ambicion ejecucion tecnico impacto; do label "criterio:$c" 1d76db "Mejora el criterio $c"; done
label "origen:loop"         cccccc "Creada automáticamente por el loop de escaneo"

NUM=$(gh project list --owner "$OWNER" --format json --jq ".projects[] | select(.title==\"$TITLE\") | .number" | head -1)
if [ -n "$NUM" ]; then
  echo "project ya existe: #$NUM"
else
  NUM=$(gh project create --owner "$OWNER" --title "$TITLE" --format json --jq .number)
  gh project field-create "$NUM" --owner "$OWNER" --name "Prioridad" --data-type SINGLE_SELECT --single-select-options "P0,P1,P2" >/dev/null
  gh project field-create "$NUM" --owner "$OWNER" --name "Tamaño" --data-type SINGLE_SELECT --single-select-options "S,M,L" >/dev/null
  gh project field-create "$NUM" --owner "$OWNER" --name "Criterio" --data-type SINGLE_SELECT --single-select-options "Originalidad,Ambición,Ejecución,Técnico,Impacto" >/dev/null
  echo "project creado: #$NUM"
fi
gh project link "$NUM" --owner "$OWNER" --repo "$REPO" 2>/dev/null || echo "(link: hazlo en la UI si tu versión de gh no tiene 'project link')"
echo "URL: $(gh project view "$NUM" --owner "$OWNER" --format json --jq .url)"
echo "Siguiente: en la UI agrega columnas 'Ready' y 'En revisión' al campo Status y activa los workflows built-in (Auto-add, Item closed → Done, PR merged → Done)."
