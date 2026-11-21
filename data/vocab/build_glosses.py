"""Genera packages/glosses/data/glosses.json desde el vocabulario de un escenario (B1).

Entradas (datos, no código):
- vocabulario: lista de {id, glosa, significa} sacada del glosario LSCh (ej. escenario_hora_medica.json,
  ver lab/v4_avatar/build_escenario.py);
- curación: renombres de glosas, palabras en español, categorías y rasgos no manuales (ej. curacion_hora_medica.json).

Reglas (PLAN-TRABAJO §1.2): solo aditivo. Las glosas que ya existen conservan su `classifierLabel` y solo se
completan; las nuevas se agregan al final con el siguiente label libre. Nunca se reordena.

Uso:  python -I data/vocab/build_glosses.py [VOCABULARIO.json] [CURACION.json] [DESTINO.json]
"""

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULTS = (
    ROOT / "data/vocab/escenario_hora_medica.json",
    ROOT / "data/vocab/curacion_hora_medica.json",
    ROOT / "packages/glosses/data/glosses.json",
)
SCHEMA = ROOT / "packages/glosses/schema/gloss.schema.json"


def patron_glosa() -> re.Pattern:
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    return re.compile(schema["properties"]["glosses"]["items"]["properties"]["gloss"]["pattern"])


def glosa_de(x: dict, cur: dict) -> str:
    return cur["glosa"].get(x["id"]) or x["glosa"].split("/")[0]  # ENFERMO/A -> ENFERMO


def construir(vocab: list[dict], cur: dict, actual: dict, patron: re.Pattern) -> dict:
    categoria_de = {i: c for c, ids in cur["categorias"].items() for i in ids}
    glosses = [dict(g) for g in actual["glosses"]]
    por_glosa = {g["gloss"]: g for g in glosses}
    siguiente = max((g["classifierLabel"] for g in glosses), default=-1) + 1

    for x in vocab:
        glosa = glosa_de(x, cur)
        if not patron.fullmatch(glosa):
            raise SystemExit(f"glosa inválida para el schema: {glosa!r} ({x['id']})")
        es = cur["es"].get(x["id"]) or [x["significa"].lower()]
        if glosa in por_glosa:  # ya existe: se completa (aditivo), sin tocar su label
            existente = por_glosa[glosa]
            existente.setdefault("lexiconId", x["id"])
            existente["es"] = existente["es"] + [e for e in cur["es"].get(x["id"], []) if e not in existente["es"]]
            continue
        cat = categoria_de.get(x["id"])
        if cat is None:
            raise SystemExit(f"falta categoría para {x['id']} en la curación")
        entrada = {
            "gloss": glosa,
            "category": cat,
            "es": es,
            "classifierLabel": siguiente,
            "clip": None,
            "animationId": None,
            "nonManual": cur.get("non_manual", {}).get(cat),
            "validatedBy": None,
            "lexiconId": x["id"],
        }
        siguiente += 1
        glosses.append(entrada)
        por_glosa[glosa] = entrada

    return {
        # Cualquier cambio de contenido (glosas nuevas o `es`/`lexiconId` completados) sube la versión.
        "version": actual["version"] + 1 if glosses != actual["glosses"] else actual["version"],
        "_comment": "Generado por data/vocab/build_glosses.py (vocabulario + curación en data/vocab). "
        "Solo aditivo: no reordenar classifierLabel. TODO(real-data): validar con una persona señante (validatedBy).",
        "glosses": glosses,
    }


def escribir(destino: Path, d: dict) -> None:
    """Una glosa por línea: los diffs de PR muestran exactamente qué glosa cambió."""
    lineas = ",\n".join("    " + json.dumps(g, ensure_ascii=False) for g in d["glosses"])
    cabecera = (
        f'  "version": {json.dumps(d["version"])},\n'
        f'  "_comment": {json.dumps(d["_comment"], ensure_ascii=False)},\n'
    )
    destino.write_text("{\n" + cabecera + '  "glosses": [\n' + lineas + "\n  ]\n}\n", encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("vocabulario", nargs="?", type=Path, default=DEFAULTS[0])
    ap.add_argument("curacion", nargs="?", type=Path, default=DEFAULTS[1])
    ap.add_argument("destino", nargs="?", type=Path, default=DEFAULTS[2])
    args = ap.parse_args()
    vocab_p, cur_p, destino = args.vocabulario, args.curacion, args.destino
    vocab = json.loads(vocab_p.read_text(encoding="utf-8"))
    cur = json.loads(cur_p.read_text(encoding="utf-8"))
    nuevo = construir(vocab, cur, json.loads(destino.read_text(encoding="utf-8")), patron_glosa())
    escribir(destino, nuevo)
    print(f"{len(nuevo['glosses'])} glosas (versión {nuevo['version']}) → {destino}")


if __name__ == "__main__":
    main()
