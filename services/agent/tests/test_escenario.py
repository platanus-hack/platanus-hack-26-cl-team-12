import json

from translator import Translator, load_escenario, load_glossary
from translator.escenario import ESCENARIOS_DIR
from translator.glossary import is_literal

G = load_glossary()


def test_todos_los_escenarios_cargan_y_sus_glosas_existen():
    archivos = list(ESCENARIOS_DIR.glob("*.json"))
    assert archivos
    for p in archivos:
        e = load_escenario(p)
        assert e.id == p.stem and e.descripcion
        for ej in e.ejemplos.get("glosas", []):
            malas = [g for g in ej["glosas"] if not (G.is_known(g) or is_literal(g))]
            assert not malas, f"{p.name}: glosas que no existen en el diccionario: {malas}"
        assert all(isinstance(v, str) for v in e.pronunciacion.values())


def test_escenario_se_elige_por_env(monkeypatch, tmp_path):
    otro = tmp_path / "banco.json"
    otro.write_text(json.dumps({"id": "banco", "descripcion": "una llamada al banco"}), encoding="utf-8")
    monkeypatch.setenv("ESCENARIO_PATH", str(otro))
    e = load_escenario()
    assert e.id == "banco" and e.ejemplos == {}
    t = Translator(None, G, e)
    assert "una llamada al banco" in t._system("simplificar")[0]["text"]
    assert "Ejemplos:" not in t._system("simplificar")[1]["text"]


def test_ejemplos_del_escenario_entran_al_prompt():
    t = Translator(None, G, load_escenario("hora_medica"))
    assert "YO QUERER HORA MÉDICO -> Quiero pedir una hora con el médico." in t._system("complejizar")[1]["text"]
    assert '"TEXTO:10:30"' in t._system("espanol_a_glosas")[1]["text"]
