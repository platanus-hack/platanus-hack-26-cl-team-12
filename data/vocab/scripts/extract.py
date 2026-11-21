#!/usr/bin/env python3
"""Extrae entradas del Diccionario bilingüe LSCh-Español (UMCE, 2009) a JSONL + recortes de fotos.

Uso:
  .venv/bin/python data/vocab/scripts/extract.py PDF [PDF...] \
      [--start N --end M] [--out data/vocab/glosario.jsonl] [--img-dir data/signs/img]

Todo es local (pymupdf), sin llamadas a API. Es idempotente: se puede volver a correr entero.
"""
import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

import pymupdf

UP = "A-ZÁÉÍÓÚÑÜ"
HEAD_RE = re.compile(rf"^(\d+)\.\s*([{UP}][{UP}0-9\-/ ().,]*)$|^([{UP}][{UP}0-9\-/ ().,]*)$")
ABBR = {"sust", "v", "tr", "intr", "prnl", "adj", "adv", "m", "f", "o", "interj", "pron",
        "prep", "conj", "loc", "art", "num", "s", "pl", "y", "fr", "p", "int"}
Y_MIN, Y_MAX = 70, 730          # fuera: franja de letra arriba y n° de página abajo
IMG_MIN_H = 60                  # descarta la franja decorativa del encabezado


def limpia(t: str) -> str:
    t = t.replace("­\n", "").replace("­", "")
    return re.sub(r"\s+", " ", t).strip()


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def parse_esp(txt: str):
    """'Esp.: v. tr. Apostar, jugar. Ant. Desechar' -> (gramatica, [sinónimos], [antónimos])"""
    m = re.search(r"Esp\.?:\s*(.*)", txt)
    if not m:
        return None, [], []
    resto = m.group(1)
    ant = []
    partes = re.split(r"\bAnt\.", resto, maxsplit=1, flags=re.I)
    if len(partes) == 2:
        resto, a = partes
        ant = [x.strip(" .") for x in a.split(",") if x.strip(" .")]
    toks = resto.split()
    gram = []
    while toks and toks[0].rstrip(".").lower() in ABBR and (toks[0].endswith(".") or (gram and toks[0] == "o")):
        gram.append(toks.pop(0))
    sin = [x.strip(" .") for x in re.sub(r"\.\s*\d+\.\s*", ", ", " ".join(toks)).split(",") if x.strip(" .")]
    return " ".join(gram) or None, sin, ant


def es_pagina_diccionario(page):
    for b in page.get_text("blocks"):
        if b[1] < Y_MIN and re.fullmatch(rf"[{UP}]", b[4].strip()):
            return True
    return False


def page_entries(page, archivo):
    d = page.get_text("dict")
    heads, texts, imgs = [], [], []
    for b in d["blocks"]:
        x0, y0, x1, y1 = b["bbox"]
        if b["type"] == 1:
            if (y1 - y0) >= IMG_MIN_H and Y_MIN < y0 < Y_MAX:
                imgs.append(b)
            continue
        if not (Y_MIN < y0 < Y_MAX):
            continue
        lines = ["".join(s["text"] for s in l["spans"]).strip() for l in b["lines"]]
        lines = [l for l in lines if l]
        if not lines:
            continue
        tag, num0 = None, None
        if len(lines) > 1 and re.fullmatch(r"_*\s*[a-z]{1,5}\.", lines[0]) and HEAD_RE.match(lines[1]):
            tag, lines = lines[0].strip("_ "), lines[1:]
        if len(lines) > 1 and re.fullmatch(r"\d+", lines[0]) and HEAD_RE.match(lines[1]):
            num0, lines = int(lines[0]), lines[1:]   # número y glosa en líneas separadas
        m = HEAD_RE.match(lines[0])
        if m:
            num = int(m.group(1)) if m.group(1) else num0
            name = (m.group(2) or m.group(3)).strip()
            heads.append({"num": num, "glosa": name, "x0": x0, "y0": y0, "rest": lines[1:], "blocks": [], "tag": tag})
        else:
            texts.append({"x0": x0, "y0": y0, "text": "\n".join(lines)})

    # bloques de texto -> glosa más cercana arriba en la misma columna
    for t in texts:
        # título mal ubicado sobre la columna de fotos (x<120): su texto está más a la derecha, justo debajo
        c = [h for h in heads if h["y0"] <= t["y0"] + 2 and (
            abs(h["x0"] - t["x0"]) < 20 or (h["x0"] < 120 <= t["x0"] and t["y0"] - h["y0"] < 100))]
        if c:
            max(c, key=lambda h: h["y0"])["blocks"].append(t)
    # imágenes: 1) misma fila que una glosa (foto a su izquierda)
    huerf, asignadas = [], []   # asignadas: (y0, glosa dueña)
    for im in imgs:
        x0, y0, x1, y1 = im["bbox"]
        c = [h for h in heads if abs(h["y0"] - y0) < 45]
        if not c:
            huerf.append(im)
            continue
        der = [h for h in c if h["x0"] >= x1 - 5]
        h = min(der, key=lambda h: h["x0"] - x1) if der else min(c, key=lambda h: abs(h["y0"] - y0))
        h.setdefault("imgs", []).append(im["bbox"])
        asignadas.append((y0, h))
    # 2) filas de fotos sin glosa en su fila. Las señas múltiples van numeradas "1","2".. a la
    #    izquierda (intro p. 14): n>=2 continúa el artículo de las fotos de arriba; n=1 o sin
    #    número es la seña de la glosa que viene debajo y aún no tiene fotos.
    labels = [t for t in d["blocks"] if t["type"] == 0 and t["bbox"][0] < 100
              and re.fullmatch(r"\d+", "".join(s["text"] for l in t["lines"] for s in l["spans"]).strip())]
    filas = {}
    for im in huerf:
        filas.setdefault(round(im["bbox"][1] / 10), []).append(im)   # una fila = mismo y0 (±5)
    for _, fila in sorted(filas.items()):
        y0 = min(im["bbox"][1] for im in fila)
        n = next((int("".join(s["text"] for l in t["lines"] for s in l["spans"]))
                  for t in labels if -5 <= y0 - t["bbox"][1] <= 20), None)
        arriba = [a for a in asignadas if a[0] < y0 - 5]
        if n and n >= 2 and arriba:
            dueno = max(arriba, key=lambda a: a[0])[1]
        else:
            deb = sorted((h for h in heads if h["y0"] > y0 and "imgs" not in h), key=lambda h: h["y0"])
            abajo = [a for a in asignadas if a[0] > y0 + 5]
            dueno = (deb[0] if deb else
                     max(arriba, key=lambda a: a[0])[1] if arriba else
                     min(abajo, key=lambda a: a[0])[1] if abajo else None)
        if dueno is not None:
            for im in sorted(fila, key=lambda b: b["bbox"][0]):
                dueno.setdefault("imgs", []).append(im["bbox"])
                asignadas.append((y0, dueno))

    out = []
    heads = [h for h in heads if not (len(h["glosa"]) == 1 and not h["rest"] and not h["blocks"])]
    for h in sorted(heads, key=lambda h: (h["y0"], h["x0"])):
        cuerpo = "\n".join(h["rest"] + [b["text"] for b in sorted(h["blocks"], key=lambda b: b["y0"])])
        cuerpo = limpia(cuerpo)
        mc = re.match(r"(?i:verbo)((?:\s+[a-záéíóúñ]+)*)\s*", cuerpo)
        clase = None
        if mc:
            clase = ("Verbo" + mc.group(1)).lower().capitalize()
            cuerpo = cuerpo[mc.end():]
        clase = clase or h.get("tag")
        defin = limpia(re.split(r"Esp\.?:", cuerpo)[0]) or None
        gram, sin, ant = parse_esp(cuerpo)
        out.append({"glosa": h["glosa"], "homonimo": h["num"], "clase": clase, "definicion": defin,
                    "gramatica": gram, "español": sin, "antonimos": ant,
                    "_imgs": h.get("imgs", []), "fuente": {"archivo": archivo, "página": page.number + 1}})
    return out


def recorta(page, rects, dest: Path):
    r = pymupdf.Rect(rects[0])
    for x in rects[1:]:
        r |= pymupdf.Rect(x)
    page.get_pixmap(clip=r, dpi=150).save(dest)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdfs", nargs="+")
    ap.add_argument("--start", type=int, default=1)
    ap.add_argument("--end", type=int, default=10**6)
    ap.add_argument("--out", default="data/vocab/glosario.jsonl")
    ap.add_argument("--img-dir", default="data/signs/img")
    a = ap.parse_args()
    img_dir = Path(a.img_dir)
    img_dir.mkdir(parents=True, exist_ok=True)

    entradas = []
    for pdf in a.pdfs:
        doc = pymupdf.open(pdf)
        nombre = Path(pdf).name
        for i in range(max(a.start, 1) - 1, min(a.end, len(doc))):
            if not es_pagina_diccionario(doc[i]):
                continue
            for e in page_entries(doc[i], nombre):
                e["_page"] = doc[i]
                entradas.append(e)

    # ids estables: homónimos -> -1, -2 ...
    from collections import Counter
    cnt = Counter(slug(e["glosa"]) for e in entradas)
    vistos = Counter()
    for e in entradas:
        base = slug(e["glosa"])
        vistos[base] += 1
        e["id"] = f"{base}-{vistos[base]}" if cnt[base] > 1 else base
    for k, e in enumerate(entradas):
        prev = entradas[k - 1] if k else None
        if (e["homonimo"] and e["homonimo"] >= 2 and not e["_imgs"] and prev
                and prev["homonimo"] == e["homonimo"] - 1 and (prev["_imgs"] or prev.get("_share"))):
            e["_share"] = prev["id"]  # la foto de una seña sirve a dos entradas (intro, p. 14)

    ruta = {}
    with open(a.out, "w", encoding="utf-8") as f:
        for e in entradas:
            page, rects = e.pop("_page"), e.pop("_imgs")
            img, comp = None, e.get("_share")
            if rects:
                recorta(page, rects, img_dir / f"{e['id']}.png")
                img = f"data/signs/img/{e['id']}.png"
            elif comp:
                img = ruta.get(comp)
            ruta[e["id"]] = img
            completa = bool(e["definicion"]) and bool(e["español"])
            conf = "alta" if completa and img else "media" if (e["definicion"] or e["español"]) else "baja"
            rec = {"id": e["id"], "glosa": e["glosa"], "español": e["español"],
                   "categoría": None, "descripcion_seña": None, "variantes": [],
                   "definicion": e["definicion"], "clase": e["clase"], "gramatica": e["gramatica"],
                   "antonimos": e["antonimos"], "homonimo": e["homonimo"], "escenario": [],
                   "fuente": e["fuente"], "imagen": img, "imagen_compartida_con": comp, "confianza": conf}
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"{len(entradas)} entradas -> {a.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
