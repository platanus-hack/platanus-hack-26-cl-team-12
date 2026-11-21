import json

from guard import MAX_GLOSAS, MAX_TEXTO, parse_cliente_message
from translator import load_glossary

G = load_glossary()


def raw(obj) -> bytes:
    return json.dumps(obj).encode()


def test_accepts_valid_text_from_cliente():
    out = parse_cliente_message(raw({"tipo": "cliente_dice", "texto": " hola "}), "cliente", G)
    assert out == {"tipo": "cliente_dice", "texto": "hola"}


def test_rejects_sender_without_server_assigned_role():
    msg = raw({"tipo": "cliente_dice", "texto": "hola"})
    assert parse_cliente_message(msg, None, G) is None
    assert parse_cliente_message(msg, "ejecutivo", G) is None
    # el rol en el contenido del mensaje no cuenta
    assert parse_cliente_message(raw({"tipo": "cliente_dice", "texto": "x", "role": "cliente"}), "otro", G) is None


def test_rejects_malformed_and_oversized_text():
    assert parse_cliente_message(b"no es json", "cliente", G) is None
    assert parse_cliente_message(b"\xff\xfe", "cliente", G) is None
    assert parse_cliente_message(raw([1, 2]), "cliente", G) is None
    assert parse_cliente_message(raw({"tipo": "cliente_dice", "texto": 5}), "cliente", G) is None
    assert parse_cliente_message(raw({"tipo": "cliente_dice", "texto": "   "}), "cliente", G) is None
    assert parse_cliente_message(raw({"tipo": "cliente_dice", "texto": "a" * (MAX_TEXTO + 1)}), "cliente", G) is None


def test_glosas_must_be_known_and_bounded():
    ok = parse_cliente_message(raw({"tipo": "glosas_cliente", "glosas": ["YO", "QUERER"]}), "cliente", G)
    assert ok == {"tipo": "glosas_cliente", "glosas": ["YO", "QUERER"]}
    assert parse_cliente_message(raw({"tipo": "glosas_cliente", "glosas": ["YO", "INVENTADA"]}), "cliente", G) is None
    assert parse_cliente_message(raw({"tipo": "glosas_cliente", "glosas": ["YO"] * (MAX_GLOSAS + 1)}), "cliente", G) is None
    assert parse_cliente_message(raw({"tipo": "glosas_cliente", "glosas": "YO"}), "cliente", G) is None


def test_ignores_message_types_clients_may_not_send():
    # `ejecutivo_dice` y `estado` los emite solo el agente.
    assert parse_cliente_message(raw({"tipo": "ejecutivo_dice", "texto": "x"}), "cliente", G) is None
    assert parse_cliente_message(raw({"tipo": "estado", "valor": "llamada_terminada"}), "cliente", G) is None
