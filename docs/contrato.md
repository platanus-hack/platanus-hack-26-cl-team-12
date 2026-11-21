# Contrato WebSocket (backend <-> web)
Mensajes JSON con campo `tipo`:
- `{"tipo":"ejecutivo_dice","texto":"...","simple":"..."}`  (simple solo desde v2)
- `{"tipo":"cliente_dice","texto":"..."}`  (texto del cliente; v2+ el backend lo complejiza antes de hablar)
- `{"tipo":"estado","valor":"llamada_iniciada|llamada_terminada"}`
- `{"tipo":"glosas_cliente","glosas":["YO","QUERER"],"confianza":0.9}`  (v3: glosas reconocidas por la cámara → agente)
- `{"tipo":"glosas_para_senar","glosas":["LUNES","MÉDICO"],"subtitulo":"..."}`  (v4: agente → reproductor de señas)

Transporte: data channel de LiveKit (ADR-0005). Tipos TS en `packages/glosses/src/contract.ts`.
