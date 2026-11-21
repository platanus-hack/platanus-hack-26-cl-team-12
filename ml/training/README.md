# ml/training — clasificador de señas (ADR-0002, vertical v3)

Entrena el clasificador de secuencias de puntos clave y lo exporta a ONNX para `packages/signs`.

## Flujo
1. **Grabar muestras** etiquetadas con la herramienta de captura (TODO(v3)): varias personas × 30–80 señas × ~20 repeticiones.
   Guardar solo **puntos clave** (nunca video) y con consentimiento firmado (ADR-0010) en `ml/data/` (gitignored).
2. **Normalizar** por centro y escala de hombros.
3. **Entrenar** (PyTorch, LSTM/GRU pequeño) en Colab o Modal.
4. **Exportar** a `.onnx` y subirlo a Supabase Storage (ADR-0009). El `classifierLabel` de cada glosa viene de
   `packages/glosses/data/glosses.json`: **no reordenar etiquetas** sin reentrenar.
5. **Evaluar** contra `data/eval/` (meta MVP: ≥ 85 % top-1 sobre el vocabulario del escenario).
