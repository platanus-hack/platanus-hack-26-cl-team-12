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
    t = Translator(client, load_glossary(), contexto="hora médica")
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


def test_espanol_a_glosas_filters_unknown_and_fingerspells():
    client = fake_client([tool_use({
        "glosas": ["LUNES", "TÚ", "INVENTADA", "MÉDICO"],
        "deletrear": ["Ana"],
        "subtitulo": "El lunes ven al médico con Ana",
    })])
    t = Translator(client, load_glossary())
    r = t.espanol_a_glosas("El lunes tiene que venir a ver a la doctora Ana")
    assert r.glosas == ["LUNES", "TÚ", "MÉDICO", "DACTILOLOGÍA:A-N-A"]
    assert r.descartadas == ["INVENTADA"]
    assert client.messages.calls[0]["tool_choice"] == {"type": "tool", "name": "emitir_glosas"}
