# Bitácora del equipo
Las entradas nuevas van **arriba**. Formato:

```
## AAAA-MM-DD HH:MM — Nombre (rama)
- Hice: ...
- Decidí: ...
- Falta / bloqueado: ...
```

## 2026-11-21 — Claude (data-glosario)
- Hice: glosario LSCh **A-H** extraído del PDF (UMCE 2009): 1057 entradas en `data/vocab/glosario.jsonl`, las 1057 con foto recortada (`data/signs/img/`, gitignored), más `glosario.md`, `glosario_compacto.txt` (33 KB, cabe entero en un prompt) y README. Todo local con pymupdf, **0 USD de API**; scripts en `data/vocab/scripts/` (`extract.py`, `build.py`), se regenera en segundos.
- Decidí: el PDF trae texto seleccionable y fotos incrustadas, así que no se necesita visión de Claude. `escenario` (salud 37, banco 19) es heurística por palabras clave: revisar. El diccionario NO describe cómo se hace la seña ni trae categorías por tema: `descripcion_seña` y `categoría` quedan en null (la seña está en la foto).
- Falta / bloqueado: procesar `Diccionario_LSCh_I-Z.pdf` (mismo script). **Licencia:** los créditos dicen "Prohibida la reproducción total o parcial de los textos, sin expresa autorización de las autoras": decidir si se pushea el texto extraído a un repo público. Sin push ni PR hasta que Tomás confirme.

## 2026-11-21 — Tomás / Claude (main)
- Hice: primera investigación v1→v4 en `data/research/` (5 notas). Hallazgos clave: v1 con Twilio Media Streams o ConversationRelay; v2 son 2 prompts con Haiku; v3 y v4 no tienen modelos para LSCh → vocabulario cerrado (MediaPipe + clasificador propio; clips pregrabados por glosa).
- Decidí: el glosario LSCh de los PDFs se estructura a JSONL; si cabe en contexto va entero al prompt con caching, sin vectorizar.
- Falta: ubicar los PDFs y procesarlos; medir STT con audios chilenos reales; definir escenario y lista de señas.

## 2026-11-21 — Tomás (main)
- Hice: clonado el repo de Platanus, scaffold (app/data/docs), backend FastAPI mínimo, plan v1–v4, contrato. Repo personal `tomasnusser/puente-hackaton` con doble push; `main` subido a ambos. Docs de onboarding para los Claudes del equipo.
- Decidí: PWA con Next.js; un solo escenario de demo; solo Tomás despliega (desde su repo personal); el resto pushea al repo de la organización.
- Falta: investigación v1→v4 en `data/research/`, backend/frontend mínimos de prueba, definir escenario de demo y nombre del proyecto, repartir verticales.
