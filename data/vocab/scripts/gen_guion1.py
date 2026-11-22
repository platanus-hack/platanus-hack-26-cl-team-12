#!/usr/bin/env python3
"""Genera data/vocab/guion1_urgencia_caida.json (checklist de grabación) y docs/GUION-1.md.
Editar FRASES y volver a correr. '+' delante = no está en el diccionario (se graba aparte)."""
import json, pathlib
R = pathlib.Path(__file__).resolve().parents[3]
D = {e['id']: e for e in map(json.loads, (R/'data/vocab/glosario.jsonl').open())}
FRASES = [
 ("P1","Persona sorda","Hola, necesito una ambulancia. Mi hijo se cayó y se quebró el codo.",
  ["hola ambulancia necesitar","hijo-a caer-persona","+codo hueso romper"]),
 ("C1","Clínica","Hola, ¿su hijo está consciente y respira bien?",
  ["hola","hijo-a despertar-se","respirar bien"]),
 ("P2","Persona sorda","Sí, está consciente, pero no puede apoyar el brazo y el codo está muy hinchado.",
  ["si hijo-a despertar-se pero","+brazo apoyar no-poder","+codo hinchado-a"]),
 ("C2","Clínica","Entendido. ¿Hay sangrado o la mano se ve pálida o fría?",
  ["entender","sangre","+mano palido-a frio"]),
 ("P3","Persona sorda","Hay un poco de sangre, pero la mano está normal. Necesito un traslado urgente.",
  ["sangre poco-a pero","+mano bien","urgente necesitar hospital ir"]),
 ("C3","Clínica","Registramos la solicitud de ambulancia. Tenemos su dirección señora, vamos en camino. Mientras llega, no mueva el brazo de su hijo.",
  ["solicitud ambulancia anotar","domicilio tener senora","ambulancia venir camino","esperar","+brazo hijo-a quieto-a"]),
]
vocab = {}
for *_, gs in FRASES:
    for g in gs:
        for t in g.split(): vocab.setdefault(t.lstrip('+'), t.startswith('+'))
bad = [k for k, ext in vocab.items() if not ext and k not in D]; assert not bad, bad
items = [{"id": k, "glosa": D[k]['glosa'] if k in D else k.upper(), "significa": D[k]['español'][0] if k in D else k,
          "tipo": "seña" if k in D else "fuera-del-diccionario"} for k in vocab]
for i, w, t, gs in FRASES:  # frases completas de corrido (mejoran las transiciones)
    items.append({"id": "frase-"+i.lower(), "glosa": "FRASE-"+i, "significa": t+"  →  "+" / ".join(g.upper().replace('+','') for g in gs), "tipo": "frase"})
json.dump(items, (R/'data/vocab/guion1_urgencia_caida.json').open('w'), ensure_ascii=False, indent=1)
inD = [k for k, e in vocab.items() if not e]; out = [k for k, e in vocab.items() if e]
md = ["# Guion 1 — llamada de urgencia por caída de un niño", "",
 "Reemplaza al escenario de hora médica. **Todas las señas se graban de nuevo** (3 tomas c/u). Las 8 anteriores quedaron respaldadas en `data/signs/_v0_hora-medica/`; las `anim/` activas siguen ahí. El checklist de la página `/` solo cuenta lo grabado desde el inicio de este guion (`data/vocab/guion1_inicio.txt`).", "",
 "> Glosas = **propuesta** (orden y elección de señas); **validar con una persona señante de LSCh**. El sistema es **bidireccional**: texto→señas (el avatar firma C1–C3) y señas→texto (se reconocen P1–P3); por eso se graba todo el vocabulario.", "",
 "## Frases y glosas", "", "| # | Quién | Texto | Glosas (/ = pausa) |", "|---|---|---|---|"]
for i, w, t, gs in FRASES:
    md.append(f"| {i} | {w} | {t} | " + " / ".join(g.upper().replace('+', '✱') for g in gs) + " |")
md += ["", "✱ = no está en el diccionario.", "", f"## Checklist: {len(vocab)} señas + {len(FRASES)} frases de corrido",
 f"**Del diccionario ({len(inD)}):** " + " · ".join(D[k]['glosa'] for k in inD), "",
 f"**Fuera del diccionario ({len(out)}) — partes del cuerpo, se señalan:** " + " · ".join(k.upper() for k in out), "",
 "**Frases completas:** " + " · ".join("FRASE-" + f[0] for f in FRASES), "",
 "## Dudas para quien valide",
 "- CONSCIENTE: usé DESPERTAR/SE. QUEBRAR: HUESO ROMPER. TRASLADO: HOSPITAL IR. NO-MOVER: QUIETO/A. NORMAL: BIEN.",
 "- Cambié rodilla→CODO; para que sea coherente también pierna→BRAZO y pie→MANO.",
 "- «Muy» y las preguntas (cejas) dependen de la cara, que el avatar aún no anima. «Su/mi/yo» y la dirección: ¿se señalan o se omiten?", "",
 "## Cómo grabar", "Ver `GUION-GRABACION.md` y la receta de `HANDOFF-V4.md`. Señas con las dos manos juntas o en contacto: ver `docs/GRABAR-MANOS-CERCA.md`."]
(R/'docs/GUION-1.md').write_text("\n".join(md) + "\n")
print(len(vocab), len(items), out)
