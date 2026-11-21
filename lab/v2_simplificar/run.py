"""Prueba rápida v2: simplifica los casos del ejecutivo y complejiza los del cliente.
Uso: python lab/v2_simplificar/run.py [ejecutivo|cliente]"""
import json, sys, time
from pathlib import Path
import anthropic

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import MODELO_LLM, requerir
from prompts import SIMPLIFICAR, COMPLEJIZAR

cliente_api = anthropic.Anthropic(api_key=requerir("ANTHROPIC_API_KEY"))
casos = json.loads((Path(__file__).parent / "casos.json").read_text())
lado = sys.argv[1] if len(sys.argv) > 1 else None


def correr(sistema: str, texto: str):
    t0 = time.time()
    r = cliente_api.messages.create(
        model=MODELO_LLM, max_tokens=300, system=sistema,
        messages=[{"role": "user", "content": texto}],
    )
    return r.content[0].text.strip(), time.time() - t0


for nombre, sistema in (("ejecutivo", SIMPLIFICAR), ("cliente", COMPLEJIZAR), ("cliente_nuevos", COMPLEJIZAR)):
    if lado and lado != nombre:
        continue
    print(f"\n=== {nombre.upper()} → {'SIMPLE' if nombre == 'ejecutivo' else 'NATURAL'} ===")
    for c in casos[nombre]:
        salida, seg = correr(sistema, c)
        print(f"\n> {c}\n< {salida}   [{seg:.2f}s]")
