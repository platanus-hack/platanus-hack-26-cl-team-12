"""Saca del Diccionario LSCh (UMCE, PDF) las fotos de las señas que usa la app y las deja en apps/web/public/senas/.

Uso (necesita PyMuPDF: pip install pymupdf):
    python -I apps/web/scripts/extraer_senas.py RUTA/Diccionario_LSCh_A-H.pdf RUTA/Diccionario_LSCh_I-Z.pdf RUTA/indice_LSCh.csv

Qué hace:
  1. Lee las glosas del vocabulario (packages/glosses/data/glosses.json) + EXTRA (las del guion de urgencia).
  2. Busca cada una en el índice (volumen y página) y, en esa página, recorta las fotos de su entrada
     (algunas señas tienen 2 fotos: inicio y fin del movimiento). Las flechas de movimiento salen en la foto.
  3. Escribe public/senas/<slug>-N.jpg y public/senas/manifest.json  {"GLOSA": ["slug-1.jpg", ...]}.

Las fotos tienen derechos de la UMCE: public/senas/ está en .gitignore y NO se sube al repositorio.
Cada persona las genera en su computador con este script.
"""
import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "apps/web/public/senas"
GLOSAS_JSON = ROOT / "packages/glosses/data/glosses.json"

# Glosas que usa el guion de urgencia de la demo y no están en el vocabulario de hora médica.
EXTRA = ["AMBULANCIA", "HIJO", "SANGRE", "RESPIRAR", "PÁLIDO", "FRÍO", "URGENTE", "AYUDAR", "ROMPER",
         "CAER-PERSONA", "NIÑO", "PREGUNTAR", "LLEGAR", "HINCHADO", "ENTENDER", "POCO"]


def variante(nombre: str) -> int:
    """'2. GRACIAS' -> 2; 'GRACIAS' -> 1."""
    m = re.match(r"\s*(\d+)\.", nombre)
    return int(m.group(1)) if m else 1


def clave(nombre: str) -> str:
    """'1. HIJO/A' -> HIJO, '¿QUÉ?' -> QUÉ, ABANICAR/SE -> ABANICAR. Mantiene tildes y guiones."""
    s = re.sub(r"^\s*\d+\.\s*", "", nombre.strip().upper())
    s = s.strip("¿?¡!.: ")
    return re.sub(r"/(A|AS|S|SE|ES)$", "", s)


def slug(nombre: str) -> str:
    s = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def main(pdf_ah: str, pdf_iz: str, indice: str) -> None:
    docs = {"A-H": pymupdf.open(pdf_ah), "I-Z": pymupdf.open(pdf_iz)}
    filas = list(csv.DictReader(open(indice, encoding="utf-8-sig")))
    por_clave: dict[tuple[str, int], dict] = {}
    for f in filas:
        por_clave.setdefault((clave(f["glosa"]), variante(f["glosa"])), f)
    por_pagina: dict[tuple[str, int], list[str]] = {}
    for f in filas:
        por_pagina.setdefault((f["volumen"], int(f["pagina_pdf"])), []).append(f["glosa"])

    vocab = json.loads(GLOSAS_JSON.read_text(encoding="utf-8"))["glosses"]
    # lexiconId del vocabulario (id UMCE): 'gracias-1', 'poder-2' -> qué variante numerada del diccionario usar.
    var_de: dict[str, int] = {}
    for g in vocab:
        m = re.search(r"-(\d)$", g.get("lexiconId") or "")
        if m:
            var_de[g["gloss"]] = int(m.group(1))
    buscadas = list(dict.fromkeys([g["gloss"] for g in vocab] + EXTRA))

    OUT.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, list[str]] = {}
    faltan: list[str] = []
    for glosa in buscadas:
        k = clave(glosa)
        fila = por_clave.get((k, var_de.get(glosa, 1))) or por_clave.get((k, 1)) or por_clave.get((k, 2))
        if not fila:
            faltan.append(glosa)
            continue
        vol, num = fila["volumen"], int(fila["pagina_pdf"])
        page = docs[vol][num - 1]
        # Dónde empieza cada entrada de la página: el bloque de texto cuya primera línea es la glosa.
        # Títulos de las entradas de la página. Se compara por clave + variante: el título impreso puede traer
        # signos (¿QUÉ?), numeración (1. TOS) o venir en la segunda línea del bloque.
        en_pagina = {(clave(n), variante(n)): n for n in por_pagina[(vol, num)]}
        titulos: dict[str, float] = {}
        for linea_bloque in page.get_text("dict")["blocks"]:
            for linea in linea_bloque.get("lines", []):
                texto = "".join(sp["text"] for sp in linea["spans"]).strip()
                nombre = en_pagina.get((clave(texto), variante(texto)))
                if nombre:
                    titulos.setdefault(nombre, (linea["bbox"][1] + linea["bbox"][3]) / 2)
        if fila["glosa"] not in titulos:
            faltan.append(glosa)
            continue
        # Cada foto pertenece al título más cercano en vertical (a veces la foto va arriba del título, a veces al lado).
        def duena(b):
            centro = (b[1] + b[3]) / 2
            return min(titulos, key=lambda n: abs(titulos[n] - centro))
        fotos = [i["bbox"] for i in page.get_image_info()]
        fotos = [b for b in fotos if (b[2] - b[0]) > 60 and (b[3] - b[1]) > 60 and (b[2] - b[0]) < page.rect.width * 0.5]
        fotos = [b for b in fotos if duena(b) == fila["glosa"]]
        fotos.sort(key=lambda b: b[0])
        if not fotos:
            faltan.append(glosa)
            continue
        archivos = []
        for n, b in enumerate(fotos, 1):
            nombre = f"{slug(glosa)}-{n}.jpg"
            page.get_pixmap(clip=pymupdf.Rect(b), dpi=130).save(OUT / nombre, jpg_quality=82)
            archivos.append(nombre)
        manifest[glosa] = archivos

    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(manifest)} señas con foto; faltan {len(faltan)}: {', '.join(faltan)}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
