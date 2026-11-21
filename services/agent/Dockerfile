# Agente traductor (ADR-0011). Contexto de build: la RAÍZ del repo (necesita packages/glosses).
#   docker build -f services/agent/Dockerfile -t puente-agent .
FROM python:3.12-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /usr/local/bin/uv
WORKDIR /app/services/agent
COPY services/agent/pyproject.toml services/agent/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

FROM python:3.12-slim
RUN useradd --create-home --uid 10001 puente
WORKDIR /app
COPY --from=build /app/services/agent/.venv /app/services/agent/.venv
COPY packages/glosses/data /app/packages/glosses/data
COPY services/agent /app/services/agent
ENV PATH="/app/services/agent/.venv/bin:$PATH" PYTHONUNBUFFERED=1
USER puente
WORKDIR /app/services/agent
CMD ["python", "agent.py", "start"]
