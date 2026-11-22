# Tests e2e (Playwright)

La PWA (`apps/web`) en un Chromium de verdad (perfil Pixel 7, cámara falsa), para que un cambio no rompa la demo.

| Proyecto | Qué prueba | Backend |
|---|---|---|
| `mock` (`tests/mock/`) | login, pestañas, buscador, tema, guion completo de la ambulancia (chat, señas con Enviar, "Repita"), colgar, calificación, atajo `?llamar=urgencias` | ninguno (`?mock=1`) |
| `real` (`tests/real/`) | la PWA ⇄ API real por `WS /twilio/cliente`: `POST /llamadas`, turnos del ejecutivo, respuestas del cliente, corte, error de Twilio, firma de Twilio | `services/api` vía `api_e2e.py` |

En `real` el test **hace de Twilio**: postea `/twilio/voz`, `/turno`, `/espera` y `/estado` con `X-Twilio-Signature` válida.
`api_e2e.py` es la API tal cual, pero sin llamadas reales (las guarda en `GET /e2e/llamadas`) y con un traductor
determinista (`Simple: …` / `Formal: …`) en vez de Claude. No usa tu `.env` ni gasta saldo.

## Correr

```bash
make e2e-install   # una vez: Chromium de Playwright
make test-e2e      # build estático de la web + API, y toda la suite (~1 min)
make test-e2e-ui   # modo interactivo con next dev (para escribir tests)
pnpm --filter @puente/e2e test:mock   # solo un proyecto
```

Usa los puertos 3100 (web) y 8765 (API), así no choca con `make dev`. Si falla, el reporte queda en
`e2e/playwright-report/` (`pnpm --filter @puente/e2e exec playwright show-report`). En la CI se sube como artifact.

## Agregar un test

- Busca por rol y nombre accesible (`getByRole("button", { name: "Colgar" })`), no por clases: así el test también cuida la accesibilidad.
- Ayudas en `tests/helpers.ts`: `sembrarPreferencias(page, { sesion: null })`, `abrirChat`, `sugerencias`, `subtitulos`, `twilio(...)`.
- Tests `real`: la API tiene **una sola sala** (una llamada a la vez), así que el proyecto corre con `workers: 1`. No lo cambies hasta que la API indexe las salas por llamada.
- No uses `next dev` en la CI: con recargas concurrentes falla al renderizar (`Unexpected end of JSON input`) y los tests se vuelven inestables.
