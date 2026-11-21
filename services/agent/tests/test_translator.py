from types import SimpleNamespace

from translator import Translator, load_glossary


class FakeMessages:
    def __init__(self, content):
        self.content = content
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(content=self.content)


def fake_client(content):
    return SimpleNamespace(messages=FakeMessages(content))


def text(t):
    return SimpleNamespace(type="text", text=t)


def tool_use(data):
    return SimpleNamespace(type="tool_use", input=data)


def test_glossary_loads_shared_dictionary():
    g = load_glossary()
    assert g.is_known("HOLA")
    assert not g.is_known("INEXISTENTE")
    assert "MÉDICO = médico, doctor" in g.as_prompt()


def test_glosas_a_espanol_returns_text_and_caches_system():
    client = fake_client([text("  Quiero pedir una hora al médico el lunes.  ")])
    t = Translator(client, load_glossary())
    out = t.glosas_a_espanol(["YO", "QUERER", "HORA", "MÉDICO", "LUNES"])
    assert out == "Quiero pedir una hora al médico el lunes."
    call = client.messages.calls[0]
    assert call["system"][0]["cache_control"] == {"type": "ephemeral"}
    assert "YO QUERER HORA MÉDICO LUNES" in call["messages"][0]["content"]


def test_fingerspell_keeps_only_letters_and_caps_length():
    from translator.glossary import fingerspell

    assert fingerspell("Ana María") == "DACTILOLOGÍA:A-N-A-M-A-R-Í-A"
    assert fingerspell("12 !!") == ""
    assert fingerspell("A" * 100).count("-") == 19  # máx. 20 letras


def test_espanol_a_glosas_keeps_literals_and_drops_unknown():
    client = fake_client([tool_use({
        "glosas": ["JUEVES", "TEXTO:10:30", "hora", "DOCTOR", "INVENTADA", "TEXTO:", "TEXTO:<script>", "TEXTO:Pérez"],
        "subtitulo": "El jueves a las 10:30 con el doctor Pérez",
    })])
    t = Translator(client, load_glossary())
    r = t.espanol_a_glosas("Le tengo hora el jueves a las 10:30 con el doctor Pérez")
    # minúsculas y variantes se normalizan; literales vacíos o con caracteres raros se descartan
    assert r.glosas == ["JUEVES", "TEXTO:10:30", "HORA", "MÉDICO", "TEXTO:Pérez"]
    assert r.descartadas == ["INVENTADA", "TEXTO:", "TEXTO:<script>"]
    call = client.messages.calls[0]
    assert call["tool_choice"] == {"type": "tool", "name": "emitir_glosas"}
    assert call["max_tokens"] >= 1000


def test_espanol_a_glosas_survives_empty_tool_output():
    t = Translator(fake_client([text("")]), load_glossary())
    r = t.espanol_a_glosas("Hola")
    assert r.glosas == [] and r.subtitulo == "Hola"


def test_validar_caps_total_and_fingerspells():
    t = Translator(fake_client([]), load_glossary())
    r = t.validar(["HOLA"] * 40, "x", deletrear=["Ana"])
    assert len(r.glosas) == 30
    assert t.validar([], "x", deletrear=["Ana"]).glosas == ["DACTILOLOGÍA:A-N-A"]


def test_simplificar_returns_simple_and_quick_replies():
    client = fake_client([tool_use({
        "simple": "Hay hora el martes 12 a las 10:30.\nO el jueves 14 a las 16:00.",
        "opciones": ["Martes 12, 10:30", "Jueves 14, 16:00", "Martes 12, 10:30", "", "x" * 41, 5, "Otro día", "Ninguna"],
    })])
    t = Translator(client, load_glossary())
    r = t.simplificar("Tenemos disponibilidad el martes 12 a las 10:30 o el jueves 14 a las 16:00 horas.")
    assert r.simple.startswith("Hay hora el martes 12")
    # sin duplicados, vacíos, largos ni no-strings; máximo 4
    assert r.opciones == ["Martes 12, 10:30", "Jueves 14, 16:00", "Otro día", "Ninguna"]
    call = client.messages.calls[0]
    assert call["tool_choice"] == {"type": "tool", "name": "emitir_simple"}
    assert call["system"][0]["cache_control"] == {"type": "ephemeral"}
    assert "hora médica" in call["system"][0]["text"]  # descripción del escenario


def test_simplificar_falls_back_to_text_without_tool():
    t = Translator(fake_client([text("Su hora es el lunes.")]), load_glossary())
    assert t.simplificar("x").simple == "Su hora es el lunes."
    t = Translator(fake_client([]), load_glossary())
    assert t.simplificar("original").simple == "original"  # nunca vacío


def test_complejizar_uses_client_text_and_shared_cached_base():
    client = fake_client([text("Tengo Fonasa, ¿cuánto tengo que pagar?")])
    t = Translator(client, load_glossary())
    assert t.complejizar("yo tener Fonasa cuánto pagar") == "Tengo Fonasa, ¿cuánto tengo que pagar?"
    call = client.messages.calls[0]
    assert call["messages"] == [{"role": "user", "content": "yo tener Fonasa cuánto pagar"}]
    assert "TAREA: eres la voz" in call["system"][1]["text"]
    assert "cache_control" not in call["system"][1]


def test_base_system_is_identical_across_tasks():
    client = fake_client([text("ok")])
    t = Translator(client, load_glossary())
    t.complejizar("a")
    t.glosas_a_espanol(["YO"])
    a, b = client.messages.calls
    assert a["system"][0] == b["system"][0]


def test_literal_helpers():
    from translator.glossary import is_literal, literal

    assert literal("10:30") == "TEXTO:10:30"
    assert literal("  12.345.678-9 ") == "TEXTO:12.345.678-9"
    assert literal("") == "" and literal("a\nb{}") == ""
    assert len(literal("x" * 100)) == len("TEXTO:") + 24
    assert is_literal("TEXTO:$25.000") and not is_literal("TEXTO:")
    assert not load_glossary().is_known("TEXTO:10:30")  # el cliente no puede mandar literales
