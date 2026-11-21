# v2 — Simplificar / complejizar con LLM
**Conclusión:** son dos prompts con un modelo rápido (Claude Haiku 5.5). Es la parte más barata y la de más valor diferencial. No requiere investigación externa, sí **diseño de prompts y evaluación**.

## Diseño
- **ejecutivo → cliente (simplificar):** frases cortas, vocabulario básico, sin tecnicismos ni negaciones dobles, una idea por mensaje; conservar cifras, fechas y nombres exactos. Opcional: devolver también "pregunta de sí/no" detectada para mostrar botones rápidos.
- **cliente → ejecutivo (complejizar):** convertir texto simple o glosas (ej. "YO QUERER HORA MÉDICO LUNES") en una frase cortés y formal, sin inventar datos.
- Contexto del escenario en el system prompt (banco / hora médica) para desambiguar.
- Latencia: streaming de tokens y modelo pequeño; objetivo < 1 s.

## Contexto lingüístico (validar con una persona sorda / intérprete)
Para muchas personas sordas el español escrito es segunda lengua; la LSCh tiene gramática propia (no es español signado). Hay que evitar infantilizar: simplificar ≠ hablarle como a un niño.

## Próximos pasos
1. Escribir los 2 prompts + 15 casos de prueba en `data/eval/`.
2. Usar el glosario LSCh (ver nota de PDFs) para que el vocabulario simple calce con señas existentes — esto conecta v2 con v3 y v4.
