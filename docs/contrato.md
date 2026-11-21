# Contrato WebSocket (backend <-> web)
Mensajes JSON con campo `tipo`:
- `{"tipo":"ejecutivo_dice","texto":"...","simple":"..."}`  (simple solo desde v2)
- `{"tipo":"cliente_dice","texto":"..."}`  (texto del cliente; v2+ el backend lo complejiza antes de hablar)
- `{"tipo":"estado","valor":"llamada_iniciada|llamada_terminada"}`
