"""API de Puente.

El .env se carga aquí, antes que cualquier módulo de app.*: twilio_media calcula PISTAS con el ESCENARIO al importarse
(antes main.py lo cargaba después de esos imports y en local se usaba el escenario por defecto).
"""

from dotenv import load_dotenv

load_dotenv()
