import asyncio

from pipeline import faltantes_sin_nombres, recortar, turno_cliente, turno_ejecutivo
from store import Store
from translator import GlossResult, SimpleResult, load_escenario


class FakeTranslator:
    def __init__(self, store=None, glosas_falla=False, simple_falla=False, cliente_falla=False):
        self.store, self.cache_hits = store, 0
        self.escenario = load_escenario("hora_medica")
        self.glosas_falla, self.simple_falla, self.cliente_falla = glosas_falla, simple_falla, cliente_falla

    def simplificar(self, texto):
        if self.simple_falla:
            raise RuntimeError("api caída")
        return SimpleResult("¿Puede venir el martes 12 a las 10:30?", ["Sí", "No"])

    def espanol_a_glosas(self, texto):
        if self.glosas_falla:
            raise RuntimeError("api caída")
        return GlossResult(["MARTES", "TEXTO:10:30", "VENIR", "PODER"], "Martes 10:30", descartadas=["VACUNA"])

    def complejizar(self, texto):
        if self.cliente_falla:
            raise RuntimeError("api caída")
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


def test_textos_largos_se_recortan_al_contrato():
    from translator.glossary import CONTRATO

    maximo = CONTRATO["max_texto"]
    assert recortar("hola") == "hola"
    r = recortar("palabra " * 200)
    assert len(r) <= maximo and r.endswith("…")
    enviados = []

    async def pub(m):
        enviados.append(m)

    correr(turno_ejecutivo("x" * (maximo + 50), FakeTranslator(glosas_falla=True), pub))
    assert len(enviados[0]["texto"]) <= maximo


def test_si_claude_falla_el_cliente_igual_es_escuchado():
    t = FakeTranslator(Store(":memory:"), cliente_falla=True)
    assert correr(turno_cliente({"tipo": "cliente_dice", "texto": "martes 10:30 bueno"}, t)) == "martes 10 y 30 bueno"


def test_si_falla_la_base_de_datos_igual_se_publican_las_glosas():
    class StoreRoto:
        def registrar_faltantes(self, _):
            raise OSError("disco lleno")

        def registrar_turno(self, *a, **k):
            raise OSError("disco lleno")

    enviados = []

    async def pub(m):
        enviados.append(m)

    correr(turno_ejecutivo("hola", FakeTranslator(StoreRoto()), pub))
    assert {m["tipo"] for m in enviados} == {"ejecutivo_dice", "glosas_para_senar"}
