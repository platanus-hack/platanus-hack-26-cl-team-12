"""Genera, con visión de Claude, una descripción escrita de CÓMO hacer cada seña a partir de su foto del diccionario.
Solo para la lista cerrada del escenario (79 glosas). Salida: data/vocab/descripciones_senas.json

  ENV_FILE=/ruta/.env python3 lab/v4_avatar/describe_senas.py [--only hola por-favor]

Son descripciones automáticas de una foto estática: pueden fallar en el movimiento. Revisarlas con una persona señante.
"""
import argparse, base64, json, os, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import anthropic
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(os.environ.get("ENV_FILE") or ROOT / ".env")
MODEL = os.environ.get("MODELO_VISION", "claude-sonnet-5-5")
OUT = ROOT / "data/vocab/descripciones_senas.json"

PROMPT = """Eres intérprete de Lengua de Señas Chilena (LSCh). Te muestro la foto del diccionario de la seña «{glosa}» ({significa}).
Definición del diccionario: {definicion}

En la foto, los NÚMEROS (1, 2…) marcan el orden de las posiciones y las FLECHAS el movimiento. Puede haber una o dos manos.
Describe CÓMO se hace, en español chileno neutro (tuteo), para alguien que no sabe señar. Formato exacto:
Manos: <una o dos; cuál es la dominante>
Forma de la mano: <dedos extendidos/doblados, palma hacia dónde>
Lugar: <dónde parte y dónde termina: frente, mejilla, pecho, espacio neutro…>
Movimiento: <pasos numerados cortos siguiendo los números y flechas de la foto>
Cara: <expresión o gesto de la boca si se ve>
Seguridad: <alta | media | baja> (baja si la foto no deja claro el movimiento)
Máximo 70 palabras en total. No inventes lo que no se ve."""

def describe(cli, e, defs):
    img = ROOT / "data/signs/img" / f"{e['id']}.png"
    if not img.exists(): return e["id"], {"error": "sin foto"}
    d = defs.get(e["id"], {})
    msg = cli.messages.create(model=MODEL, max_tokens=500, messages=[{"role": "user", "content": [
        {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": base64.b64encode(img.read_bytes()).decode()}},
        {"type": "text", "text": PROMPT.format(glosa=e["glosa"], significa=e["significa"], definicion=(d.get("definicion") or e["significa"]))}]}])
    txt = "".join(b.text for b in msg.content if b.type == "text").strip()
    return e["id"], {"descripcion": txt, "modelo": MODEL}

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--only", nargs="*"); a = ap.parse_args()
    esc = json.loads((ROOT / "data/vocab/escenario_hora_medica.json").read_text())
    if a.only: esc = [e for e in esc if e["id"] in a.only]
    defs = {}
    for line in (ROOT / "data/vocab/glosario.jsonl").read_text().splitlines():
        d = json.loads(line); defs[d["id"]] = d
    out = json.loads(OUT.read_text()) if OUT.exists() else {}
    todo = [e for e in esc if "descripcion" not in out.get(e["id"], {})]
    print(f"{len(todo)} por describir ({len(esc) - len(todo)} ya hechas)", file=sys.stderr)
    cli = anthropic.Anthropic()
    with ThreadPoolExecutor(6) as ex:
        for i, (k, v) in enumerate(ex.map(lambda e: describe(cli, e, defs), todo), 1):
            out[k] = v; print(f"[{i}/{len(todo)}] {k}", file=sys.stderr)
            OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print("listo →", OUT)

if __name__ == "__main__":
    main()
