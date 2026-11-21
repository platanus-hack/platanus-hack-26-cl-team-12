"""Genera packages/glosses/data/glosses.json desde el vocabulario del escenario (B1).

Entrada: data/vocab/escenario_hora_medica.json (79 glosas de "pedir hora al médico", ver lab/v4_avatar/build_escenario.py).
Reglas (PLAN-TRABAJO §1.2): solo aditivo. Las glosas que ya existen conservan su `classifierLabel`;
las nuevas se agregan al final con el siguiente label libre. Nunca se reordena.

Uso:  python -I data/vocab/build_glosses.py
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ESCENARIO = ROOT / "data/vocab/escenario_hora_medica.json"
DESTINO = ROOT / "packages/glosses/data/glosses.json"

# id del glosario UMCE -> glosa (solo cuando la glosa original no sirve: "X/A" o duplicados).
GLOSA = {"manana-2": "MAÑANA-AM"}

# id -> palabras en español que el LLM debe asociar a la seña (las del PDF traen sinónimos poco útiles).
ES = {
    "permiso": ["permiso", "disculpe"],
    "medico": ["médico", "doctor", "doctora"],
    "horario": ["horario", "agenda"],
    "hospital": ["hospital", "clínica", "centro médico"],
    "salud": ["salud"],
    "control": ["control", "chequeo"],
    "dolor": ["dolor", "malestar"],
    "enfermo-a": ["enfermo", "enferma"],
    "gripe": ["gripe"],
    "resfrio": ["resfrío"],
    "enfermedad": ["enfermedad"],
    "prueba": ["examen", "prueba"],
    "remedio": ["remedio", "medicamento"],
    "atender": ["atender", "atención"],
    "documento": ["documento", "cédula", "carnet"],
    "domicilio": ["domicilio", "dirección"],
    "seguro-a": ["seguro", "segura"],
    "fecha": ["fecha"],
    "manana-1": ["mañana (el día siguiente)"],
    "manana-2": ["mañana (en la mañana, AM)"],
    "ayer": ["ayer"],
    "tarde-1": ["tarde (PM)"],
    "noche": ["noche"],
    "antes": ["antes", "anticipación"],
    "despues": ["después", "luego"],
    "primero-a": ["primero", "primera"],
    "segundo-a": ["segundo", "segunda", "segundo piso"],
    "querer": ["querer", "desear"],
    "necesitar": ["necesitar"],
    "poder-2": ["poder"],
    "no-poder": ["no poder"],
    "no-haber": ["no hay", "no quedan"],
    "ocupado-a": ["ocupado", "ocupada", "sin cupo"],
    "anular": ["anular", "cancelar (una hora)"],
    "cambiar": ["cambiar", "reagendar"],
    "comprobar": ["comprobar", "confirmar"],
    "repetir": ["repetir"],
    "esperar": ["esperar"],
    "comprender": ["comprender", "entender"],
    "no-entender": ["no entender"],
    "hablar": ["hablar"],
    "escribir": ["escribir", "mensaje escrito"],
    "sordo-a": ["sordo", "sorda"],
    "venir": ["venir", "llegar", "presentarse"],
    "ir": ["ir"],
    "tener": ["tener"],
    "donde": ["dónde"],
    "cuando": ["cuándo"],
    "que": ["qué"],
    "cuanto-s": ["cuánto", "cuántos"],
    "como-1": ["cómo"],
    "quien": ["quién"],
    "pagar": ["pagar", "costo"],
    "dinero": ["dinero", "plata", "valor"],
    "otro-a": ["otro", "otra"],
    "mas": ["más"],
    "bueno-a-2": ["bueno", "está bien", "ok"],
}

CATEGORIA = {
    "saludo": "hola por-favor gracias-1 permiso",
    "respuesta": "si no bueno-a-2",
    "salud": "medico hospital salud control dolor enfermo-a fiebre tos gripe resfrio enfermedad prueba remedio atender",
    "dato": "nombre-1 apellido telefono documento domicilio seguro-a",
    "tiempo": "hora horario fecha dia hoy manana-1 manana-2 ayer tarde-1 noche lunes martes miercoles jueves viernes "
    "sabado semana mes minuto antes despues primero-a segundo-a",
    "verbo": "querer necesitar poder-2 no-poder no-haber ocupado-a anular cambiar comprobar repetir esperar comprender "
    "no-entender hablar escribir sordo-a venir ir tener pagar",
    "pregunta": "donde cuando que cuanto-s como-1 quien",
    "otro": "dinero otro-a mas",
}
CATEGORIA_DE = {i: c for c, ids in CATEGORIA.items() for i in ids.split()}

PREGUNTA_NM = "cejas fruncidas (pregunta abierta)"
PATRON = re.compile(r"^[A-ZÁÉÍÓÚÑÜ0-9-]+$")


def glosa_de(x: dict) -> str:
    if x["id"] in GLOSA:
        return GLOSA[x["id"]]
    return x["glosa"].split("/")[0]  # ENFERMO/A -> ENFERMO, CUÁNTO/S -> CUÁNTO


def construir(escenario: list[dict], actual: dict) -> dict:
    glosses = [dict(g) for g in actual["glosses"]]
    por_glosa = {g["gloss"]: g for g in glosses}
    siguiente = max((g["classifierLabel"] for g in glosses), default=-1) + 1

    for x in escenario:
        glosa = glosa_de(x)
        if not PATRON.fullmatch(glosa):
            raise SystemExit(f"glosa inválida para el schema: {glosa!r} ({x['id']})")
        if glosa in por_glosa:  # ya existe: se completa (aditivo), sin tocar su label
            existente = por_glosa[glosa]
            existente.setdefault("lexiconId", x["id"])
            existente["es"] = existente["es"] + [e for e in ES.get(x["id"], []) if e not in existente["es"]]
            continue
        cat = CATEGORIA_DE.get(x["id"])
        if cat is None:
            raise SystemExit(f"falta categoría para {x['id']}")
        entrada = {
            "gloss": glosa,
            "category": cat,
            "es": ES.get(x["id"], [x["significa"].lower()]),
            "classifierLabel": siguiente,
            "clip": None,
            "animationId": None,
            "nonManual": PREGUNTA_NM if cat == "pregunta" else None,
            "validatedBy": None,
            "lexiconId": x["id"],
        }
        siguiente += 1
        glosses.append(entrada)
        por_glosa[glosa] = entrada

    return {
        "version": actual["version"] + 1 if len(glosses) != len(actual["glosses"]) else actual["version"],
        "_comment": "Generado por data/vocab/build_glosses.py desde data/vocab/escenario_hora_medica.json (hora médica). "
        "Solo aditivo: no reordenar classifierLabel. TODO(real-data): validar con una persona señante (validatedBy).",
        "glosses": glosses,
    }


def main() -> None:
    escenario = json.loads(ESCENARIO.read_text(encoding="utf-8"))
    actual = json.loads(DESTINO.read_text(encoding="utf-8"))
    nuevo = construir(escenario, actual)
    lineas = ",\n".join("    " + json.dumps(g, ensure_ascii=False) for g in nuevo["glosses"])
    cabecera = json.dumps({"version": nuevo["version"], "_comment": nuevo["_comment"]}, ensure_ascii=False, indent=2)
    DESTINO.write_text(cabecera[:-2] + ',\n  "glosses": [\n' + lineas + "\n  ]\n}\n", encoding="utf-8")
    print(f"{len(nuevo['glosses'])} glosas (versión {nuevo['version']}) → {DESTINO.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
