import asyncio

from pipeline import faltantes_sin_nombres, turno_cliente, turno_ejecutivo
from store import Store
from translator import GlossResult, SimpleResult, load_escenario


class FakeTranslator:
    def __init__(self, store=None, glosas_falla=False, simple_falla=False):
        self.store, self.cache_hits = store, 0
        self.escenario = load_escenario("hora_medica")
        self.glosas_falla, self.simple_falla = glosas_falla, simple_falla

    def simplificar(self, texto):
        if self.simple_falla:
            raise RuntimeError("api caída")
        return SimpleResult("¿Puede venir el martes 12 a las 10:30?", ["Sí", "No"])

    def espanol_a_glosas(self, texto):
        if self.glosas_falla:
            raise RuntimeError("api caída")
        return GlossResult(["MARTES", "TEXTO:10:30", "VENIR", "PODER"], "Martes 10:30", descartadas=["VACUNA"])

    def complejizar(self, texto):
        return "Mi RUT es 12.345.678-9"

    def glosas_a_espanol(self, glosas):
        return "Quiero pedir una hora."


def correr(coro):
    return asyncio.run(coro)


def test_turno_ejecutivo_publica_v2_y_v4_y_mide():
    enviados, store = [], Store(":memory:")

    async def pub(m):
        enviados.append(m)

    correr(turno_ejecutivo("  ¿Le acomoda el martes 12 a las 10:30?  ", FakeTranslator(store), pub, sala="s"))
    tipos = {m["tipo"]: m for m in enviados}
    assert tipos["ejecutivo_dice"] == {
        "tipo": "ejecutivo_dice", "texto": "¿Le acomoda el martes 12 a las 10:30?",
        "simple": "¿Puede venir el martes 12 a las 10:30?", "opciones": ["Sí", "No"],
    }
    assert tipos["glosas_para_senar"]["glosas"] == ["MARTES", "TEXTO:10:30", "VENIR", "PODER"]
    assert store.resumen_latencia()[0]["turnos"] == 1
    assert store.glosas_faltantes() == [("VACUNA", 1)]


def test_v4_caida_no_bloquea_v2():
    enviados = []

    async def pub(m):
        enviados.append(m)

    correr(turno_ejecutivo("hola", FakeTranslator(glosas_falla=True), pub))
    assert [m["tipo"] for m in enviados] == ["ejecutivo_dice"]


def test_si_simplificar_falla_igual_llega_el_texto():
    enviados = []

    async def pub(m):
        enviados.append(m)

    correr(turno_ejecutivo("hola", FakeTranslator(simple_falla=True, glosas_falla=True), pub))
    assert enviados == [{"tipo": "ejecutivo_dice", "texto": "hola", "simple": None}]


def test_turno_ejecutivo_ignora_vacio():
    enviados = []

    async def pub(m):
        enviados.append(m)

    correr(turno_ejecutivo("   ", FakeTranslator(), pub))
    assert enviados == []


def test_turno_cliente_devuelve_texto_para_voz():
    t = FakeTranslator(Store(":memory:"))
    voz = correr(turno_cliente({"tipo": "cliente_dice", "texto": "mi rut 12.345.678-9"}, t))
    assert voz == "Mi rut es 12 millones 345 mil 678, guion 9"
    assert correr(turno_cliente({"tipo": "glosas_cliente", "glosas": ["YO", "QUERER", "HORA"]}, t)) == "Quiero pedir una hora."
    assert t.store.resumen_latencia()[0]["direccion"] == "cliente_a_ejecutivo"


def test_faltantes_no_guardan_nombres():
    assert faltantes_sin_nombres(["PÉREZ", "VACUNA", "MARÍA"], "Doctor Pérez, traiga la vacuna. María igual") == ["VACUNA"]
