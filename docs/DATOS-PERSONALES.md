# Inventario de datos personales

Guía: skill `seguridad-datos-cl` (Ley 19.628 modificada por la Ley 21.719). No es asesoría legal.
Actualízalo en el mismo PR que agregue, mueva o envíe un dato personal.

## Llamada telefónica (v1, plan C: `services/api/app/twilio_media.py` y `app/llamada.py`)

| Dato | Finalidad | Sensible | Dónde pasa / se guarda | Retención | Encargado (proveedor) |
|---|---|---|---|---|---|
| Número de teléfono del ejecutivo | Hacer la llamada | No | `.env` (`ALLOWED_DESTINATIONS`) y Twilio (EE. UU.) | Logs de llamadas de Twilio, según su política | Twilio |
| Voz del ejecutivo | Transcribir lo que dice | Puede serlo | Twilio `<Gather speech>` (EE. UU.); **no** la guardamos | No la guardamos | Twilio |
| Transcripción del ejecutivo (puede traer RUT, previsión o datos de salud) | Simplificarla para el cliente | **Sí** (salud) | Memoria del servidor, Claude API (EE. UU.) y chat del cliente; **no va a los logs** | Solo en memoria mientras dura la llamada | Anthropic, Twilio |
| Texto del cliente sordo (puede traer RUT o datos de salud) | Decirlo al ejecutivo | **Sí** (salud) | Memoria del servidor, Claude API (EE. UU.) y voz de Twilio; **no va a los logs** | Solo en memoria hasta que se dice | Anthropic, Twilio |

## Pendientes antes de un producto real
- [ ] Transferencia internacional (art. 27): Twilio y Anthropic procesan en EE. UU. Revisar sus DPA y que la API no entrene con los datos.
- [ ] Consentimiento expreso para datos de salud (art. 16): aviso en la app antes de la primera llamada. Hoy el saludo telefónico solo avisa al ejecutivo que hay un intérprete.
- [ ] `/twilio/cliente` sin autenticación (A4): cualquiera con la URL podría leer la conversación en curso (OWASP API1).
- [ ] Twilio guarda en su consola los registros de llamada y los resultados de `<Gather>`. Revisar la retención en la cuenta.
- [ ] Política pública `docs/privacidad.md` (art. 14 ter).

Para la demo usamos solo datos ficticios (RUT de ejemplo, ningún paciente real).
