# Guion 1 — llamada de urgencia por caída de un niño

Reemplaza al escenario de hora médica. **Todas las señas se graban de nuevo** (3 tomas c/u). Las 8 anteriores quedaron respaldadas en `data/signs/_v0_hora-medica/`; las `anim/` activas siguen ahí. El checklist de la página `/` solo cuenta lo grabado desde el inicio de este guion (`data/vocab/guion1_inicio.txt`).

> Glosas = **propuesta** (orden y elección de señas); **validar con una persona señante de LSCh**. El sistema es **bidireccional**: texto→señas (el avatar firma C1–C3) y señas→texto (se reconocen P1–P3); por eso se graba todo el vocabulario.

## Frases y glosas

| # | Quién | Texto | Glosas (/ = pausa) |
|---|---|---|---|
| P1 | Persona sorda | Hola, necesito una ambulancia. Mi hijo se cayó y se quebró el codo. | HOLA AMBULANCIA NECESITAR / HIJO-A CAER-PERSONA / ✱CODO HUESO ROMPER |
| C1 | Clínica | Hola, ¿su hijo está consciente y respira bien? | HOLA / HIJO-A DESPERTAR-SE / RESPIRAR BIEN |
| P2 | Persona sorda | Sí, está consciente, pero no puede apoyar el brazo y el codo está muy hinchado. | SI HIJO-A DESPERTAR-SE PERO / ✱BRAZO APOYAR NO-PODER / ✱CODO HINCHADO-A |
| C2 | Clínica | Entendido. ¿Hay sangrado o la mano se ve pálida o fría? | ENTENDER / SANGRE / ✱MANO PALIDO-A FRIO |
| P3 | Persona sorda | Hay un poco de sangre, pero la mano está normal. Necesito un traslado urgente. | SANGRE POCO-A PERO / ✱MANO BIEN / URGENTE NECESITAR HOSPITAL IR |
| C3 | Clínica | Registramos la solicitud de ambulancia. Tenemos su dirección señora, vamos en camino. Mientras llega, no mueva el brazo de su hijo. | SOLICITUD AMBULANCIA ANOTAR / DOMICILIO TENER SENORA / AMBULANCIA VENIR CAMINO / ESPERAR / ✱BRAZO HIJO-A QUIETO-A |

✱ = no está en el diccionario.

## Checklist: 35 señas + 6 frases de corrido
**Del diccionario (32):** HOLA · AMBULANCIA · NECESITAR · HIJO/A · CAER-PERSONA · HUESO · ROMPER · DESPERTAR/SE · RESPIRAR · BIEN · SÍ · PERO · APOYAR · NO-PODER · HINCHADO/A · ENTENDER · SANGRE · PÁLIDO/A · FRÍO · POCO/A · URGENTE · HOSPITAL · IR · SOLICITUD · ANOTAR · DOMICILIO · TENER · SEÑORA · VENIR · CAMINO · ESPERAR · QUIETO/A

**Fuera del diccionario (3) — partes del cuerpo, se señalan:** CODO · BRAZO · MANO

**Frases completas:** FRASE-P1 · FRASE-C1 · FRASE-P2 · FRASE-C2 · FRASE-P3 · FRASE-C3

## Dudas para quien valide
- CONSCIENTE: usé DESPERTAR/SE. QUEBRAR: HUESO ROMPER. TRASLADO: HOSPITAL IR. NO-MOVER: QUIETO/A. NORMAL: BIEN.
- Cambié rodilla→CODO; para que sea coherente también pierna→BRAZO y pie→MANO.
- «Muy» y las preguntas (cejas) dependen de la cara, que el avatar aún no anima. «Su/mi/yo» y la dirección: ¿se señalan o se omiten?

## Cómo grabar
Ver `GUION-GRABACION.md` y la receta de `HANDOFF-V4.md`. Señas con las dos manos juntas o en contacto: ver `docs/GRABAR-MANOS-CERCA.md`.
