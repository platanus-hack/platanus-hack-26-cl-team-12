# Glosario LSCh (data/vocab)
Generado el 2026-11-21 desde los diccionarios en PDF. No editar a mano: se regenera con los scripts.

## Cifras
- **Entradas:** 1057 (Diccionario_LSCh_A-H.pdf: 1057)
- **Con imagen:** 1057 (9 comparten la foto de la entrada anterior, ver más abajo)
- **Confianza:** alta: 1055, media: 2
- **Escenarios (heurística):** salud 37, banco 19
- `glosario_compacto.txt` pesa ~33 KB: cabe entero en un prompt (usar prompt caching).

## Archivos
- `glosario.jsonl`: una entrada por seña (campos: id, glosa, español[], categoría, descripcion_seña, variantes[], fuente, imagen, confianza, escenario, y extra: definicion, clase, gramatica, antonimos, homonimo, imagen_compartida_con).
- `glosario.md`: legible, agrupado por escenario y letra. `glosario_compacto.txt`: solo `GLOSA: significado`.
- Fotos en `data/signs/img/<id>.png` (gitignored). Una entrada con varias señas (o varias fotos) es un solo PNG con las fotos juntas, de arriba abajo en el orden del diccionario.

## Qué NO trae el diccionario (campos en null)
- `descripcion_seña`: el diccionario no describe la configuración de mano ni el movimiento; solo foto + definición. La seña está en la imagen.
- `categoría`: no hay campos semánticos (salud, tiempo…). Solo hay `clase` (p. ej. "Verbo pleno", "Verbo de concordancia") y `gramatica` (`sust. m.`, `v. tr.`).
- `variantes`: no están marcadas; las señas distintas de una misma glosa aparecen como varias fotos en la misma entrada.

## Convenciones del diccionario (intro, p. 14)
- Glosas numeradas (`1. ALMORZAR`, `2. ALMUERZO`) son entradas distintas; si la numerada no trae foto propia, comparte la de la anterior (`imagen_compartida_con`).
- Glosa con dos o más señas: fotos numeradas de arriba hacia abajo en el mismo artículo.
- Homónimos llevan id `glosa-1`, `glosa-2` (orden de aparición); el resto, id sin sufijo.

## Problemas conocidos
- Entradas con confianza no alta: `aplaudir-2` (p. 51, media), `dia-de` (p. 205, media).
- Si el PDF trae solo A-H, faltan I-Z (el PDF `Diccionario_LSCh_I-Z.pdf` se procesa con el mismo script).
- `escenario` es por palabras clave sobre glosa y sinónimos cortos: puede dejar fuera glosas útiles o sumar falsas. Revisar antes de la demo.
- Hay entradas con definición de varias acepciones en un solo texto (`// 2. ...`): se dejaron tal cual en `definicion`.

## Licencia / autoría (IMPORTANTE)
Diccionario bilingüe Lengua de Señas Chilena-Español, Universidad Metropolitana de Ciencias de la Educación (UMCE), edición 2009. Autoras: Ximena Acuña Robertson, Dora Adamo Quintela, Irene Cabrera Ramírez. Fotografía: Marco Antonio Readi.
La página de créditos dice: *"Prohibida la reproducción total o parcial de los textos, sin expresa autorización de las autoras."* Los PDF y las fotos NO se versionan. El texto extraído de aquí es un derivado: confirmar con las autoras/UMCE antes de publicarlo o usarlo fuera del hackatón.

## Cómo regenerar
```bash
.venv/bin/pip install pymupdf
.venv/bin/python data/vocab/scripts/extract.py RUTA/Diccionario_LSCh_A-H.pdf RUTA/Diccionario_LSCh_I-Z.pdf
.venv/bin/python data/vocab/scripts/build.py
```
`extract.py` es local (sin API) y tarda segundos; es idempotente, así que reanudar es volver a correrlo.
