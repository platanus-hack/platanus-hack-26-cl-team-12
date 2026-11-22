#!/usr/bin/env python3
"""Toma data/vocab/glosario.jsonl (salida de extract.py), etiqueta `escenario` y genera:
glosario.jsonl (actualizado), glosario.md, glosario_compacto.txt y README.md.

Uso: .venv/bin/python data/vocab/scripts/build.py
"""
import collections
import json
import re
import unicodedata
from datetime import date
from pathlib import Path

VOCAB = Path(__file__).resolve().parent.parent
JSONL = VOCAB / "glosario.jsonl"

# Heurística por palabras clave. CORE: vale en cualquier token de la glosa o de sus sinónimos cortos.
# EXACT: palabras genéricas (hola, no, lunes, peso...) que solo cuentan si la glosa entera es esa.
# Es una primera pasada para elegir demos: REVISAR a mano.
SALUD_CORE = set("""medico medica doctor doctora hospital clinica consultorio cesfam enfermo enferma enfermedad
enfermera enfermero dolor doler fiebre tos resfrio resfriado remedio medicina receta examen cita urgencia ambulancia
sangre presion diabetes alergia embarazo embarazada dentista salud sintoma vacuna inyeccion pastilla operacion cirugia
paciente gripe""".split())
SALUD_EXACT = set("""hola chao adios gracias favor permiso perdon disculpa si no bien mal despedida bienvenida
lunes martes miercoles jueves viernes sabado domingo hoy ayer manana tarde noche dia semana mes ano fecha feriado
hora horas cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince veinte treinta
cuarenta cincuenta cien mil numero cabeza estomago garganta pecho espalda""".split())
SALUD_EXACT |= {"buenos dias", "buenas tardes", "buenas noches", "buen dia", "hasta luego", "de nada",
                "por favor", "con permiso", "fin de semana"}
BANCO_CORE = set("""banco cuenta dinero plata tarjeta clave rut firma firmar cheque credito debito deposito depositar
giro girar transferencia transferir pago pagar cobrar cobro deuda saldo cajero ahorro ahorrar prestamo interes cuota
cartola contrato carnet cedula identidad billete moneda contrasena gasto comision efectivo sueldo""".split())
BANCO_EXACT = {"peso", "pesos", "documento", "certificado", "numero"}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9 ]+", " ", s)


def escenarios(e) -> list:
    glosa = norm(e["glosa"]).split()
    frase = " ".join(glosa)
    # "BUENOS-DÍAS" -> frase "buenos dias"; "ENFERMO/A" -> tokens enfermo, a
    toks = set(glosa)
    for sin in e["español"][:1]:            # solo el 1er significado: los sinónimos traen otros sentidos
        toks |= set(norm(sin).split())
    out = []
    if toks & SALUD_CORE or frase in SALUD_EXACT or set(frase.split()) & {"dolor"}:
        out.append("salud")
    if toks & BANCO_CORE or frase in BANCO_EXACT:
        out.append("banco")
    return out


def etiqueta(e) -> str:
    n = re.search(r"-(\d+)$", e["id"])
    sufijo = f" ({n.group(1)})" if n and norm(e["glosa"]).strip().replace(" ", "-") != e["id"] else ""
    return e["glosa"] + sufijo


def significado(e) -> str:
    if e["español"]:
        return ", ".join(e["español"])
    return (e["definicion"] or "?")[:60]


def main():
    r = [json.loads(l) for l in open(JSONL, encoding="utf-8")]
    for e in r:
        e["escenario"] = escenarios(e)
    with open(JSONL, "w", encoding="utf-8") as f:
        for e in r:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")

    lineas = [f"{etiqueta(e)}: {significado(e)}" for e in r]
    (VOCAB / "glosario_compacto.txt").write_text("\n".join(lineas) + "\n", encoding="utf-8")

    md = [f"# Glosario LSCh ({len(r)} entradas)",
          "Formato `GLOSA: significado`. `(n)` = misma glosa con otra seña o significado. "
          "Fuente: Diccionario bilingüe LSCh-Español, UMCE 2009. Escenarios = heurística por palabras clave (revisar).", ""]
    for esc in ("salud", "banco"):
        sel = [e for e in r if esc in e["escenario"]]
        md += [f"## Escenario: {esc} ({len(sel)})"] + [f"- {etiqueta(e)}: {significado(e)}" for e in sel] + [""]
    md += ["## Todas, por letra"]
    por_letra = collections.defaultdict(list)
    for e in r:
        por_letra[unicodedata.normalize("NFKD", e["glosa"])[0]].append(e)
    for L in sorted(por_letra):
        md += [f"### {L}"] + [f"- {etiqueta(e)}: {significado(e)}" for e in por_letra[L]]
    (VOCAB / "glosario.md").write_text("\n".join(md) + "\n", encoding="utf-8")

    # --- README ---
    conf = collections.Counter(e["confianza"] for e in r)
    archivos = collections.Counter(e["fuente"]["archivo"] for e in r)
    con_img = sum(1 for e in r if e["imagen"])
    comp = [e["id"] for e in r if e.get("imagen_compartida_con")]
    dudosas = [f'`{e["id"]}` (p. {e["fuente"]["página"]}, {e["confianza"]})' for e in r if e["confianza"] != "alta"]
    sal = sum(1 for e in r if "salud" in e["escenario"])
    ban = sum(1 for e in r if "banco" in e["escenario"])
    txt_kb = (VOCAB / "glosario_compacto.txt").stat().st_size // 1024
    readme = f"""# Glosario LSCh (data/vocab)
Generado el {date.today().isoformat()} desde los diccionarios en PDF. No editar a mano: se regenera con los scripts.

## Cifras
- **Entradas:** {len(r)} ({", ".join(f"{k}: {v}" for k, v in archivos.items())})
- **Con imagen:** {con_img} ({len(comp)} comparten la foto de la entrada anterior, ver más abajo)
- **Confianza:** {", ".join(f"{k}: {conf[k]}" for k in ("alta", "media", "baja") if conf[k])}
- **Escenarios (heurística):** salud {sal}, banco {ban}
- `glosario_compacto.txt` pesa ~{txt_kb} KB: cabe entero en un prompt (usar prompt caching).

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
- Entradas con confianza no alta: {", ".join(dudosas) or "ninguna"}.
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
"""
    (VOCAB / "README.md").write_text(readme, encoding="utf-8")
    print(f"{len(r)} entradas; salud={sal} banco={ban}; compacto={txt_kb}KB")


if __name__ == "__main__":
    main()
