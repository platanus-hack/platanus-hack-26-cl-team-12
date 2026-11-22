"""app/traductor.py: la API usa el Translator del agente (misma fuente de prompts) en un hilo aparte."""

import asyncio

from app.traductor import MAX_TEXTO, SimpleResult, Traductor


class TranslatorFalso:
    def __init__(self):
        self.recibido = []

    def simplificar(self, texto):
        self.recibido.append(texto)
        return SimpleResult(simple=texto.upper(), opciones=["Sí", "No"])

    def complejizar(self, texto):
        self.recibido.append(texto)
        return f"frase({texto})"


def test_envuelve_el_translator_del_agente_y_trunca():
    t = TranslatorFalso()
    tr = Traductor(t)
    r = asyncio.run(tr.simplificar("x" * (MAX_TEXTO + 50)))
    assert r.opciones == ["Sí", "No"] and len(t.recibido[0]) == MAX_TEXTO
    assert asyncio.run(tr.complejizar("martes bueno")) == "frase(martes bueno)"


def test_es_el_mismo_translator_que_usa_el_agente():
    import translator

    assert SimpleResult is translator.SimpleResult  # una sola fuente, no una copia
