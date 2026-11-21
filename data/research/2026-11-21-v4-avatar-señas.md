# v4 — Voz → avatar en lengua de señas
**Conclusión:** generar LSCh con IA es investigación abierta y no hay modelo para LSCh. Para la demo: **vocabulario cerrado** → un LLM mapea la frase a una **secuencia de glosas** → se reproducen **clips pregrabados** (video de una persona señante) o animaciones de un avatar 3D por cada glosa.

## Opciones
| Opción | Realismo | Esfuerzo | Nota |
|---|---|---|---|
| **Clips de video pregrabados concatenados** | Alto (persona real) | Medio: grabar 30–60 clips | Más seguro para la demo |
| Avatar 3D + animaciones por seña (MMS-Player, GPL-3.0) | Medio | Alto | Necesita datos de movimiento por seña |
| Modelos generativos (SOKE, SignSparK, Stable Signer) | Variable | Muy alto | Entrenados en otros idiomas (ASL, DGS…), sin LSCh; código no siempre liberado |

## Lo que sirve de la literatura
Pipeline dominante: **texto → glosas → poses/animación** (T2G2P). Nos quedamos con el primer paso (texto→glosas con LLM + glosario) y reemplazamos el último por clips.

## Próximos pasos
1. Elegir las 30–60 señas del escenario y grabar clips (con persona señante, buena luz, fondo neutro).
2. Reproductor web que encadene clips con transiciones cortas.
3. Mostrar subtítulo bajo el avatar.

## Fuentes
- [Signs as Tokens (SOKE), ICCV 2025](https://arxiv.org/abs/2411.17799v3)
- [MMS-Player: avatares parametrizados, open source](https://arxiv.org/html/2507.16463v1)
- [Stable Signer V3](https://arxiv.org/pdf/2610.24926)
