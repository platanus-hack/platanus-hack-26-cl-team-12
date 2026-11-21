"""El diccionario compartido es un contrato congelado: solo crece, nunca se reordena."""

import json
import re

from translator.glossary import DEFAULT_PATH

DATA = json.loads(DEFAULT_PATH.read_text(encoding="utf-8"))
SCHEMA = json.loads((DEFAULT_PATH.parents[1] / "schema/gloss.schema.json").read_text(encoding="utf-8"))
G = DATA["glosses"]

# Las 12 glosas del Bloque 0: su classifierLabel no puede cambiar (lo usa el modelo de visión).
ORIGINALES = {"HOLA": 0, "GRACIAS": 1, "SÍ": 2, "NO": 3, "YO": 4, "TÚ": 5, "QUERER": 6, "HORA": 7,
              "MÉDICO": 8, "LUNES": 9, "MAÑANA": 10, "DÓNDE": 11}


def test_tiene_el_vocabulario_del_escenario():
    assert len(G) >= 79
    assert {"FONASA"}.isdisjoint(g["gloss"] for g in G)  # sin glosas inventadas
    assert {"PAGAR", "VIERNES", "MAÑANA-AM", "NO-ENTENDER", "SORDO"} <= {g["gloss"] for g in G}


def test_glosas_y_labels_unicos():
    assert len({g["gloss"] for g in G}) == len(G)
    assert len({g["classifierLabel"] for g in G}) == len(G)


def test_labels_originales_congelados():
    labels = {g["gloss"]: g["classifierLabel"] for g in G}
    assert {k: labels[k] for k in ORIGINALES} == ORIGINALES


def test_cumple_el_schema():
    props = SCHEMA["properties"]["glosses"]["items"]
    patron = re.compile(props["properties"]["gloss"]["pattern"])
    for g in G:
        assert set(props["required"]) <= g.keys(), g["gloss"]
        assert g.keys() <= props["properties"].keys(), g["gloss"]
        assert patron.fullmatch(g["gloss"]), g["gloss"]
        assert g["es"] and all(isinstance(e, str) and e for e in g["es"])
