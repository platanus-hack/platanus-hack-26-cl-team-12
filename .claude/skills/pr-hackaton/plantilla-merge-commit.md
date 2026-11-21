# Plantilla de mensaje de merge commit

Título (máx. ~72 caracteres, sin prefijo Conventional Commits):

```
Merge #<n>: <resumen en una línea de lo que entra>
```

Cuerpo:

```
Qué se hizo:
- <cambio 1, en lenguaje del usuario o del equipo>
- <cambio 2>

Por qué:
<problema o idea que lo motiva, 1 a 2 frases. Enlace al issue: Cierra #<issue>>

Verificación:
<cómo se comprobó: CI verde, tests, demo, screenshot>

Advertencias:
<"Ninguna" o la lista de ⚠️/❌ que quedaron abiertas al mergear, con quién las asumió>

Rama: <head> → <base>
PR: #<n>
```

## Ejemplo

```
Merge #14: release del MVP de registro de voluntarios a producción

Qué se hizo:
- Formulario de registro con validación y guardado en la base
- Panel de coordinador con el listado filtrable

Por qué:
Primera versión usable para la demo. Cubre el flujo principal que el jurado va a probar.
Cierra #6, cierra #9

Verificación:
CI verde (lint, tests, osv-scanner). Probado en el ambiente dev con 3 usuarios de prueba.

Advertencias:
- ⚠️ 2 commits "wip" en el historial (aceptado por @<revisor> para no reescribir dev)

Rama: dev → main
PR: #14
```
