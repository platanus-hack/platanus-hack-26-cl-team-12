# Contrato WebSocket (backend <-> web)
Mensajes JSON con campo `tipo`:
- `{"tipo":"ejecutivo_dice","texto":"...","simple":"...","opciones":["Sí","No"]}`  (simple solo desde v2; `opciones` opcional, máx. 4 respuestas rápidas cuando el ejecutivo pregunta)
- `{"tipo":"cliente_dice","texto":"..."}`  (texto del cliente; v2+ el backend lo complejiza antes de hablar)
- `{"tipo":"cliente_dijo","texto":"..."}`  (backend → app: la frase en español en que se convirtió lo que firmó o escribió el cliente, la misma que se dice por voz; la app la muestra para que se vea a qué se convirtió)
- `{"tipo":"estado","valor":"llamada_iniciada|llamada_terminada"}`
- `{"tipo":"glosas_cliente","glosas":["YO","QUERER"],"confianza":0.9}`  (v3: glosas reconocidas por la cámara → agente)
- `{"tipo":"glosas_para_senar","glosas":["JUEVES","TEXTO:10:30","HORA","MÉDICO"],"subtitulo":"..."}`  (v4: agente → reproductor de señas). `TEXTO:<dato>` = hora, cifra, RUT o nombre sin seña: se muestra en grande, no se firma. Solo lo emite el agente.

Transporte: data channel de LiveKit (ADR-0005). Tipos TS en `packages/glosses/src/contract.ts`.
