"""Un turno de la llamada, sin LiveKit: así se testea con un traductor falso y publish/decir en memoria.

- turno_ejecutivo: texto del STT → `ejecutivo_dice` (v2, apenas está) y `glosas_para_senar` (v4), en paralelo.
- turno_cliente: texto o glosas del cliente → frase natural → texto normalizado para el TTS.
"""

import asyncio
import logging
import re
import time
from collections.abc import Awaitable, Callable

from translator import Translator
from translator.translate import MAX_TEXTO
from translator.voz import normalizar_para_voz

log = logging.getLogger("puente.pipeline")

Publish = Callable[[dict], Awaitable[None]]


def faltantes_sin_nombres(descartadas: list[str], texto: str) -> list[str]:
    """Quita las glosas descartadas que vienen de una palabra con mayúscula del texto (posible nombre propio:
    "doctor Pérez" → PÉREZ). Así la tabla de glosas faltantes no guarda nombres de personas."""
    capitalizadas = {w.lower() for w in re.findall(r"[^\W\d_]+", texto) if w[0].isupper()}
    return [g for g in descartadas if g.lower() not in capitalizadas]


def recortar(texto: str, maximo: int = MAX_TEXTO) -> str:
    """El contrato rechaza textos sobre `max_texto`: se recortan aquí para que el subtítulo nunca se pierda."""
    return texto if len(texto) <= maximo else texto[: maximo - 1].rstrip() + "…"


def _ms(t0: float) -> int:
    return round((time.perf_counter() - t0) * 1000)


def _registrar(translator: Translator, sala: str, direccion: str, **metricas) -> None:
    if translator.store is None:
        return
    try:
        translator.store.registrar_turno(sala, direccion, **metricas)
    except Exception:  # las métricas nunca deben botar la llamada
        log.exception("no se pudo registrar el turno")


async def turno_ejecutivo(texto: str, translator: Translator, publish: Publish, sala: str = "") -> None:
    texto = texto.strip()
    if not texto:
        return
    t0 = time.perf_counter()
    hits0 = translator.cache_hits
    metricas: dict = {}

    async def v2():
        t = time.perf_counter()
        r = await asyncio.to_thread(translator.simplificar, texto)
        metricas["llm_simple_ms"] = _ms(t)
        msg = {"tipo": "ejecutivo_dice", "texto": recortar(texto), "simple": recortar(r.simple)}
        if r.opciones:
            msg["opciones"] = r.opciones
        await publish(msg)

    async def v4():
        t = time.perf_counter()
        r = await asyncio.to_thread(translator.espanol_a_glosas, texto)
        metricas["llm_glosas_ms"] = _ms(t)
        metricas["n_glosas"], metricas["n_descartadas"] = len(r.glosas), len(r.descartadas)
        faltantes = faltantes_sin_nombres(r.descartadas, texto)
        if faltantes and translator.store is not None:
            await asyncio.to_thread(translator.store.registrar_faltantes, faltantes)
        if r.glosas:
            await publish({"tipo": "glosas_para_senar", "glosas": r.glosas, "subtitulo": recortar(r.subtitulo)})

    resultados = await asyncio.gather(v2(), v4(), return_exceptions=True)
    v2_err, v4_err = resultados
    if isinstance(v2_err, Exception):
        log.error("simplificar falló: %r", v2_err)
        await publish({"tipo": "ejecutivo_dice", "texto": recortar(texto), "simple": None})  # al menos el texto
    if isinstance(v4_err, Exception):
        log.warning("glosas fallaron (v4 no bloquea v2): %r", v4_err)

    metricas["total_ms"] = _ms(t0)
    metricas["cache_hit"] = int(translator.cache_hits > hits0)
    log.info("turno ejecutivo→cliente %s", metricas)
    _registrar(translator, sala, "ejecutivo_a_cliente", **metricas)


async def turno_cliente(msg: dict, translator: Translator, sala: str = "") -> str:
    """Devuelve el texto listo para el TTS (ya normalizado). `msg` viene validado por guard.py."""
    t0 = time.perf_counter()
    hits0 = translator.cache_hits
    if msg["tipo"] == "cliente_dice":
        frase = await asyncio.to_thread(translator.complejizar, msg["texto"])
    else:
        frase = await asyncio.to_thread(translator.glosas_a_espanol, msg["glosas"])
    llm_ms = _ms(t0)
    voz = normalizar_para_voz(frase, translator.escenario.pronunciacion)
    _registrar(
        translator, sala, "cliente_a_ejecutivo",
        llm_voz_ms=llm_ms, total_ms=_ms(t0), cache_hit=int(translator.cache_hits > hits0),
    )
    log.info("turno cliente→ejecutivo %d ms", llm_ms)
    return voz
