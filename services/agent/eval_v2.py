"""Evalúa v2/v4 contra Claude real y escribe un informe para revisión humana (B2). No corre en CI.

Uso (desde services/agent, con ANTHROPIC_API_KEY en .env):
    uv run python eval_v2.py [CASOS.json] [--salida INFORME.md] [--sin-cache]

Por defecto usa la base de datos del agente (store.py) y además **precalienta la caché** con las
`frases_frecuentes` del escenario (las únicas cacheables), que en la demo salen sin llamar a Claude.
--sin-cache mide latencia real sin tocar la base de datos.
"""

import argparse
import json
import time
from datetime import date
from pathlib import Path

from translator.glossary import REPO_ROOT

DEFAULT_CASOS = REPO_ROOT / "data/eval/v2_casos.json"


def chequear(caso: dict, salida: str, opciones: list[str] | None = None) -> list[str]:
    """Devuelve los problemas encontrados (lista vacía = pasa los chequeos automáticos)."""
    problemas = []
    bajo = salida.lower()
    problemas += [f"perdió «{d}»" for d in caso.get("debe_contener", []) if d.lower() not in bajo]
    problemas += [f"agregó «{d}»" for d in caso.get("no_debe_contener", []) if d.lower() in bajo]
    if opciones is not None:
        if len(opciones) < caso.get("opciones_min", 0):
            problemas.append(f"faltan opciones ({len(opciones)} < {caso['opciones_min']})")
        if "opciones_max" in caso and len(opciones) > caso["opciones_max"]:
            problemas.append(f"sobran opciones ({len(opciones)} > {caso['opciones_max']})")
    return problemas


def evaluar(translator, casos: dict) -> tuple[list[dict], dict]:
    filas = []
    for tarea, casos_tarea in (("simplificar", casos.get("simplificar", [])),
                               ("complejizar", casos.get("complejizar", [])),
                               ("glosas", casos.get("glosas", []))):
        for caso in casos_tarea:
            t0 = time.perf_counter()
            if tarea == "simplificar":
                r = translator.simplificar(caso["entrada"])
                salida, extra = r.simple, r.opciones
                problemas = chequear(caso, salida, r.opciones)
            elif tarea == "complejizar":
                salida, extra = translator.complejizar(caso["entrada"]), None
                problemas = chequear(caso, salida)
            else:
                r = translator.espanol_a_glosas(caso["entrada"])
                salida, extra = " ".join(r.glosas), r.descartadas
                problemas = chequear(caso, salida)
            filas.append({"tarea": tarea, "entrada": caso["entrada"], "salida": salida, "extra": extra,
                          "ms": round((time.perf_counter() - t0) * 1000), "problemas": problemas})
    ok = sum(1 for f in filas if not f["problemas"])
    ms = sorted(f["ms"] for f in filas) or [0]
    return filas, {"casos": len(filas), "pasan": ok, "p50_ms": ms[len(ms) // 2], "max_ms": ms[-1]}


def precalentar(translator) -> int:
    """Traduce una vez cada frase de la lista blanca del escenario para dejarla en la caché."""
    n = 0
    for frase in translator.escenario.frases_frecuentes.get("ejecutivo", []):
        translator.simplificar(frase)
        translator.espanol_a_glosas(frase)
        n += 1
    for frase in translator.escenario.frases_frecuentes.get("cliente", []):
        translator.complejizar(frase)
        n += 1
    return n


def informe(filas: list[dict], resumen: dict, modelo: str) -> str:
    def celda(s) -> str:
        return str(s).replace("|", "\\|").replace("\n", "<br>")

    out = [f"# Evaluación v2/v4 — {date.today().isoformat()}",
           f"Modelo `{modelo}` · {resumen['pasan']}/{resumen['casos']} pasan los chequeos automáticos · "
           f"latencia p50 {resumen['p50_ms']} ms, máx. {resumen['max_ms']} ms.",
           "", "Revisión humana: marcar en la última columna si la salida es correcta y natural.", ""]
    for tarea in ("simplificar", "complejizar", "glosas"):
        sub = [f for f in filas if f["tarea"] == tarea]
        if not sub:
            continue
        extra = {"simplificar": "Opciones", "complejizar": "", "glosas": "Descartadas"}[tarea]
        out += [f"## {tarea}", "", f"| Entrada | Salida | {extra} | ms | Chequeos | Revisión |", "|---|---|---|---|---|---|"]
        out += [f"| {celda(f['entrada'])} | {celda(f['salida'])} | {celda(', '.join(f['extra'] or []))} | {f['ms']} | "
                f"{celda('; '.join(f['problemas']) or 'OK')} | |" for f in sub]
        out.append("")
    return "\n".join(out)


def main() -> None:
    import anthropic
    from dotenv import load_dotenv

    from store import abrir_store
    from translator import Translator, load_escenario, load_glossary

    load_dotenv()
    load_dotenv(REPO_ROOT / ".env")
    ap = argparse.ArgumentParser()
    ap.add_argument("casos", nargs="?", default=str(DEFAULT_CASOS))
    ap.add_argument("--salida", default=str(REPO_ROOT / f"data/eval/resultados-v2-{date.today().isoformat()}.md"))
    ap.add_argument("--sin-cache", action="store_true")
    args = ap.parse_args()

    store = None if args.sin_cache else abrir_store()
    t = Translator(anthropic.Anthropic(), load_glossary(), load_escenario(), store=store)
    filas, resumen = evaluar(t, json.loads(Path(args.casos).read_text(encoding="utf-8")))
    Path(args.salida).write_text(informe(filas, resumen, t.model), encoding="utf-8")
    print(f"{resumen} → {args.salida}")
    if store:
        print(f"caché precalentada con {precalentar(t)} frases frecuentes")
        print("glosas faltantes más pedidas:", store.glosas_faltantes(10))


if __name__ == "__main__":
    main()
