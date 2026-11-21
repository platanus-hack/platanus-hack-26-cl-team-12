"""Validación de mensajes que llegan al agente por data channel.

Cualquier participante de la sala puede publicar datos, así que el agente solo confía en:
  1. el atributo `role` asignado por el servidor en el token (/token), no en el contenido del mensaje;
  2. mensajes bien formados, con tipos correctos y límites de largo (lo que se dice por voz es input externo).
"""

import json

from translator import Glossary
from translator.glossary import CONTRATO

MAX_TEXTO = CONTRATO["max_texto"]
MAX_GLOSAS = CONTRATO["max_glosas"]
MAX_GLOSAS_CHARS = CONTRATO["max_glosas_chars"]
ROL_CLIENTE = "cliente"


def parse_cliente_message(raw: bytes, sender_role: str | None, glossary: Glossary) -> dict | None:
    """Devuelve el mensaje validado, o None si hay que ignorarlo."""
    if sender_role != ROL_CLIENTE:
        return None
    try:
        msg = json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return None
    if not isinstance(msg, dict):
        return None

    if msg.get("tipo") == "cliente_dice":
        texto = msg.get("texto")
        if not isinstance(texto, str) or not texto.strip() or len(texto) > MAX_TEXTO:
            return None
        return {"tipo": "cliente_dice", "texto": texto.strip()}

    if msg.get("tipo") == "glosas_cliente":
        glosas = msg.get("glosas")
        if not isinstance(glosas, list) or not glosas or len(glosas) > MAX_GLOSAS:
            return None
        if not all(isinstance(g, str) and glossary.is_known(g) for g in glosas):
            return None
        if sum(len(g) for g in glosas) > MAX_GLOSAS_CHARS:  # tope al tamaño que llega al prompt
            return None
        return {"tipo": "glosas_cliente", "glosas": glosas}

    return None
