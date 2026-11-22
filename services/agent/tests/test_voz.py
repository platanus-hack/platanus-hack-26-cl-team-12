import pytest

from translator import load_escenario
from translator.voz import VozNoConfigurada, elegir_voz, normalizar_para_voz

PRON = load_escenario("hora_medica").pronunciacion


def test_rut_se_dice_como_en_chile():
    assert normalizar_para_voz("mi RUT es 12.345.678-9", PRON) == "mi rut es 12 millones 345 mil 678, guion 9"
    assert normalizar_para_voz("1.000.005-k") == "1 millón 5, guion ka"
    assert normalizar_para_voz("9876543-2") == "9 millones 876 mil 543, guion 2"


def test_horas_y_montos():
    assert normalizar_para_voz("el martes a las 10:30") == "el martes a las 10 y 30"
    assert normalizar_para_voz("a las 9:00 o 16:05") == "a las 9 o 16 y 5"
    assert normalizar_para_voz("cuesta $25.000") == "cuesta 25.000 pesos"


def test_pronunciacion_viene_del_escenario():
    assert normalizar_para_voz("Uso Buk y FONASA", PRON) == "Uso Buc y Fonasa"
    assert normalizar_para_voz("Uso Buk", {}) == "Uso Buk"
    frase = "Quiero pedir una hora con el médico."
    assert normalizar_para_voz(frase, PRON) == frase


def test_elegir_voz(monkeypatch):
    for v in ("VOZ_CLIENTE", "ELEVENLABS_VOICE_ID", "ELEVENLABS_VOICE_ID_HOMBRE"):
        monkeypatch.delenv(v, raising=False)
    with pytest.raises(VozNoConfigurada):
        elegir_voz()
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "mujer-id")
    assert elegir_voz("hombre") == "mujer-id"  # sin voz de hombre, usa la principal
    monkeypatch.setenv("ELEVENLABS_VOICE_ID_HOMBRE", "hombre-id")
    assert elegir_voz() == "mujer-id"
    assert elegir_voz("Hombre") == "hombre-id"
    monkeypatch.setenv("VOZ_CLIENTE", "hombre")
    assert elegir_voz() == "hombre-id"
    assert elegir_voz("mujer") == "mujer-id"  # la preferencia del cliente manda
