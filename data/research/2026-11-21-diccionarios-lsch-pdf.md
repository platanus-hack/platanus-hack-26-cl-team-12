# Diccionarios LSCh en PDF → formato útil para IA
**Estado:** Tomás tiene los PDFs; aún no están en el repo (ver ubicación en la bitácora cuando se suban). Los PDFs pesados/con derechos van en `data/signs/` (gitignored); lo extraído y estructurado va versionado en `data/vocab/`.

## Plan
1. **Inspeccionar**: ¿PDF con texto seleccionable o escaneado/imágenes? Los diccionarios de señas suelen ser mayormente imágenes/ilustraciones con la palabra al lado.
2. **Extraer**: texto con `pymupdf`/`pdfplumber`; si es imagen, usar Claude con visión (página → JSON) o OCR.
3. **Estructurar** en `data/vocab/glosario.jsonl`, una entrada por seña: `{id, glosa, español, categoría, descripción_de_la_seña, página, imagen}`. Recortar la ilustración de cada seña a `data/signs/img/<id>.png`.
4. **Usarlo**:
   - Si el glosario cabe en contexto (unos miles de palabras): **meterlo completo en el prompt con prompt caching**. Es más rápido y simple que vectorizar y evita fallos de recuperación.
   - Si es grande: embeddings multilingües + búsqueda (sqlite-vec o Chroma) para recuperar las N glosas más cercanas.
5. Conexiones: v2 (vocabulario simple que calce con señas existentes), v3 (lista de clases a reconocer), v4 (glosas → clips).

## Pendiente
- Pasar la ruta de los PDFs y ver cuántas páginas/entradas tienen y su licencia.
