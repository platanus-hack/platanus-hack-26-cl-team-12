import json
from types import SimpleNamespace

from translator import Translator, load_glossary
from translator.glossary import DEFAULT_PATH, FINGERSPELL_PREFIX, FINGERSPELL_RE, fingerspell


def fake_client(content):
    calls = []

    def create(**kw):
        calls.append(kw)
        return SimpleNamespace(content=content)

    return SimpleNamespace(messages=SimpleNamespace(create=create, calls=calls))


def text(t):
    return SimpleNamespace(type="text", text=t)


def tool_use(data):
    return SimpleNamespace(type="tool_use", input=data)


def write_dict(tmp_path, glosses):
    p = tmp_path / "g.json"
    p.write_text(json.dumps({"version": 7, "glosses": glosses}), encoding="utf-8")
    return p


def test_default_path_points_to_shared_package():
    assert DEFAULT_PATH.exists()
    assert DEFAULT_PATH.parts[-3:] == ("glosses", "data", "glosses.json")


def test_load_glossary_from_explicit_path(tmp_path):
    p = write_dict(tmp_path, [{"gloss": "PERRO", "es": ["perro", "can"]}])
    g = load_glossary(p)
    assert g.version == 7
    assert g.is_known("PERRO") and not g.is_known("HOLA")
    assert g.as_prompt() == "PERRO = perro, can"


def test_load_glossary_respects_env(tmp_path, monkeypatch):
    p = write_dict(tmp_path, [{"gloss": "GATO", "es": ["gato"]}])
    monkeypatch.setenv("GLOSSES_PATH", str(p))
    assert load_glossary().is_known("GATO")


def test_shared_dictionary_is_consistent():
    data = json.loads(DEFAULT_PATH.read_text(encoding="utf-8"))
    glosses = [g["gloss"] for g in data["glosses"]]
    labels = [g["classifierLabel"] for g in data["glosses"]]
    assert len(set(glosses)) == len(glosses)
    assert len(set(labels)) == len(labels)
    assert all(g["es"] for g in data["glosses"])


def test_fingerspell_roundtrips_through_strict_regex():
    for word in ["Ana", "Ñuñoa", "José", "Güemes", "A" * 20]:
        f = fingerspell(word)
        assert f.startswith(FINGERSPELL_PREFIX)
        assert FINGERSPELL_RE.fullmatch(f), f
    assert FINGERSPELL_RE.fullmatch(FINGERSPELL_PREFIX + "-".join("A" * 21)) is None


def test_simplificar_returns_stripped_text():
    client = fake_client([text("  Su hora es el lunes. "), text("")])
    t = Translator(client, load_glossary(), contexto="banco")
    assert t.simplificar("Le informo que su hora quedó agendada para el lunes") == "Su hora es el lunes."
    call = client.messages.calls[0]
    assert "Escenario: banco" in call["system"][0]["text"]
    assert "agendada para el lunes" in call["messages"][0]["content"]


def test_validar_drops_unfingerspellable_words():
    t = Translator(fake_client([]), load_glossary())
    r = t.validar(["HOLA", "NOEXISTE"], ["123", "Ana"], "Hola Ana")
    assert r.glosas == ["HOLA", "DACTILOLOGÍA:A-N-A"]
    assert r.descartadas == ["NOEXISTE"]
    assert r.subtitulo == "Hola Ana"


def test_espanol_a_glosas_without_deletrear_field():
    client = fake_client([text("pensando"), tool_use({"glosas": ["HOLA"], "subtitulo": "Hola"})])
    r = Translator(client, load_glossary()).espanol_a_glosas("Hola")
    assert r.glosas == ["HOLA"] and r.descartadas == []
