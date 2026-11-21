"""El script de evaluación corre de punta a punta con un traductor falso (sin red)."""

import json

from eval_v2 import DEFAULT_CASOS, chequear, evaluar, informe
from translator import GlossResult, SimpleResult


class Eco:
    def simplificar(self, texto):
        return SimpleResult(texto, ["Sí", "No"])

    def complejizar(self, texto):
        return texto

    def espanol_a_glosas(self, texto):
        return GlossResult(["HOLA"], texto, descartadas=["X"])


def test_chequeos():
    assert chequear({"debe_contener": ["10:30"]}, "a las 10:30") == []
    assert chequear({"debe_contener": ["10:30"]}, "a las 10") == ["perdió «10:30»"]
    assert chequear({"no_debe_contener": ["hola"]}, "Hola, quiero") == ["agregó «hola»"]
    assert chequear({"opciones_min": 2}, "x", ["Sí"]) == ["faltan opciones (1 < 2)"]
    assert chequear({"opciones_max": 0}, "x", ["Sí"]) == ["sobran opciones (1 > 0)"]


def test_casos_reales_corren_y_generan_informe():
    casos = json.loads(DEFAULT_CASOS.read_text(encoding="utf-8"))
    assert len(casos["simplificar"]) + len(casos["complejizar"]) >= 15
    filas, resumen = evaluar(Eco(), casos)
    assert resumen["casos"] == len(filas) == sum(len(v) for k, v in casos.items() if not k.startswith("_"))
    md = informe(filas, resumen, "fake")
    assert md.startswith("# Evaluación v2/v4") and "## complejizar" in md


def test_precalentar_recorre_las_frases_frecuentes():
    from eval_v2 import precalentar
    from translator import load_escenario

    t = Eco()
    t.escenario = load_escenario("hora_medica")
    f = t.escenario.frases_frecuentes
    assert precalentar(t) == len(f["ejecutivo"]) + len(f["cliente"])
