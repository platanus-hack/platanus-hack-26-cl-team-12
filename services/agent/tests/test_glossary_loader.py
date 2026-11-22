import json

from translator import load_glossary
from translator.glossary import DEFAULT_PATH, FINGERSPELL_PREFIX, FINGERSPELL_RE, fingerspell


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


def test_fingerspell_roundtrips_through_strict_regex():
    for word in ["Ana", "Ñuñoa", "José", "Güemes", "A" * 20]:
        f = fingerspell(word)
        assert f.startswith(FINGERSPELL_PREFIX)
        assert FINGERSPELL_RE.fullmatch(f), f
    assert FINGERSPELL_RE.fullmatch(FINGERSPELL_PREFIX + "-".join("A" * 21)) is None
