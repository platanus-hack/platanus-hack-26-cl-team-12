# API (ADR-0011). Contexto de build: la RAÍZ del repo (necesita packages/glosses).
#   docker build -f services/api/Dockerfile -t puente-api .
FROM python:3.12-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /usr/local/bin/uv
WORKDIR /app/services/api
COPY services/api/pyproject.toml services/api/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

FROM python:3.12-slim
RUN useradd --create-home --uid 10001 puente
WORKDIR /app
COPY --from=build /app/services/api/.venv /app/services/api/.venv
COPY packages/glosses/data /app/packages/glosses/data
# Prompts de simplificar/complejizar (B). TODO(v2): moverlos a services/agent/translator/.
COPY lab/v2_simplificar/prompts.py /app/lab/v2_simplificar/prompts.py
COPY services/api /app/services/api
# API_ENV=production apaga Swagger (/docs, /redoc, /openapi.json) en el contenedor desplegado.
ENV PATH="/app/services/api/.venv/bin:$PATH" PYTHONUNBUFFERED=1 API_ENV=production
USER puente
WORKDIR /app/services/api
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
