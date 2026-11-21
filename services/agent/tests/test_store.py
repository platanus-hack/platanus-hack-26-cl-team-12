from types import SimpleNamespace

from store import Store, cacheable
from translator import Translator, load_glossary


def store():
    return Store(":memory:")


def test_cache_solo_frases_sin_digitos():
    s = store()
    s.cache_put("simplificar", "v1", "¿En qué  puedo ayudarle?", {"simple": "¿Qué necesita?", "opciones": []})
    assert s.cache_get("simplificar", "v1", "¿en qué puedo ayudarle?") == {"simple": "¿Qué necesita?", "opciones": []}
    assert s.cache_get("simplificar", "v2", "¿En qué puedo ayudarle?") is None  # otra versión del prompt
    # con datos personales (dígitos) no se guarda nada, ni en la entrada ni en la salida
    s.cache_put("simplificar", "v1", "Su RUT es 12.345.678-9", {"simple": "x"})
    s.cache_put("simplificar", "v1", "a las diez y media", {"simple": "A las 10:30"})
    assert s.cache_get("simplificar", "v1", "a las diez y media") is None
    assert not cacheable("Su RUT es 12.345.678-9") and not cacheable("")


def test_cache_no_guarda_nombres_ni_texto_largo_del_cliente_ni_la_entrada():
    s = store()
    assert not cacheable("soy María y necesito hora")  # nombre propio a mitad de frase
    assert cacheable("¿En qué puedo ayudarle?") and cacheable("YO QUERER HORA MÉDICO") and cacheable("Sí. Bueno")
    s.cache_put("simplificar", "v1", "le habla la secretaria", {"simple": "Habla Camila", "opciones": []})
    assert s.cache_get("simplificar", "v1", "le habla la secretaria") is None  # la salida traía un nombre
    s.cache_put("complejizar", "v1", "yo tener dolor cabeza fuerte hace semanas", {"frase": "x"}, max_palabras=4)
    assert s.cache_get("complejizar", "v1", "yo tener dolor cabeza fuerte hace semanas", max_palabras=4) is None
    s.cache_put("complejizar", "v1", "sí", {"frase": "Sí."}, max_palabras=4)
    assert s.cache_get("complejizar", "v1", "Sí", max_palabras=4) == {"frase": "Sí."}
    cols = [c[1] for c in s._db.execute("PRAGMA table_info(traducciones_cache)")]
    assert "entrada" not in cols


def test_metricas_y_faltantes():
    s = store()
    s.registrar_turno("sala-1", "ejecutivo_a_cliente", llm_simple_ms=800, total_ms=1000, cache_hit=0)
    s.registrar_turno("sala-1", "ejecutivo_a_cliente", llm_simple_ms=1, total_ms=2, cache_hit=1)
    (r,) = s.resumen_latencia()
    assert r == {"direccion": "ejecutivo_a_cliente", "turnos": 2, "promedio_ms": 501, "max_ms": 1000, "tasa_cache": 0.5}
    s.registrar_faltantes(["VACUNA", "VACUNA", "texto libre con espacios", "EXAMEN"])
    assert s.glosas_faltantes() == [("VACUNA", 2), ("EXAMEN", 1)]


class FakeMessages:
    def __init__(self, content):
        self.content, self.calls = content, []

    def create(self, **kw):
        self.calls.append(kw)
        return SimpleNamespace(content=self.content)


def test_translator_usa_la_cache():
    tool = SimpleNamespace(type="tool_use", input={"simple": "¿Qué necesita?", "opciones": []})
    client = SimpleNamespace(messages=FakeMessages([tool]))
    t = Translator(client, load_glossary(), store=store())
    a = t.simplificar("¿En qué puedo ayudarle?")
    b = t.simplificar("¿En qué puedo ayudarle?")
    assert a == b and len(client.messages.calls) == 1
    t.simplificar("Su hora es a las 10:30")
    t.simplificar("Su hora es a las 10:30")
    assert len(client.messages.calls) == 3  # con dígitos siempre va a Claude
