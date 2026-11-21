"""Arma data/vocab/escenario_hora_medica.json y copia las fotos de las señas elegidas.
Uso: python -I lab/v4_avatar/build_escenario.py RUTA_GLOSARIO.jsonl RUTA_IMG_DIR
(Glosario y fotos viven en la rama data-glosario; las fotos NO se versionan: derechos UMCE.)"""
import json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
# id del glosario -> nota de uso (solo cuando hay homónimos)
IDS = """hola por-favor gracias-1 si no permiso
medico hora horario hospital salud control dolor enfermo-a fiebre tos gripe resfrio enfermedad prueba remedio atender
nombre-1 apellido telefono documento domicilio seguro-a
fecha dia hoy manana-1 manana-2 ayer tarde-1 noche lunes martes miercoles jueves viernes sabado semana mes minuto antes despues primero-a segundo-a
querer necesitar poder-2 no-poder no-haber ocupado-a anular cambiar comprobar repetir esperar comprender no-entender hablar escribir sordo-a venir ir tener
donde cuando que cuanto-s como-1 quien pagar dinero otro-a mas bueno-a-2""".split()
NOTAS = {"manana-1": "mañana (el día siguiente)", "manana-2": "mañana (horas de la mañana, AM)",
         "tarde-1": "tarde (PM)", "gracias-1": "gracias", "poder-2": "poder (ser capaz)",
         "como-1": "¿cómo?", "bueno-a-2": "bueno / está bien", "nombre-1": "nombre"}

gl = {}
for l in open(sys.argv[1]):
    x = json.loads(l); gl[x["id"]] = x
img_dir = Path(sys.argv[2]); out_img = ROOT / "data/signs/img"; out_img.mkdir(parents=True, exist_ok=True)
sal, faltan = [], []
for i in IDS:
    x = gl.get(i)
    if not x or not (img_dir / f"{i}.png").exists():
        faltan.append(i); continue
    shutil.copy(img_dir / f"{i}.png", out_img / f"{i}.png")
    sal.append({"id": i, "glosa": x["glosa"], "significa": NOTAS.get(i) or ", ".join(x["español"][:3])})
(ROOT / "data/vocab").mkdir(parents=True, exist_ok=True)
(ROOT / "data/vocab/escenario_hora_medica.json").write_text(json.dumps(sal, ensure_ascii=False, indent=1))
print(len(sal), "glosas; faltan:", faltan)
