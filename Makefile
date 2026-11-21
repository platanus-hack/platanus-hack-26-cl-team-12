# Puente: atajos para instalar, correr y probar todo.  `make` (o `make help`) lista los comandos.
# Primera vez:  make setup   y después   make dev
SHELL := /bin/bash
.DEFAULT_GOAL := help

API   := services/api
AGENT := services/agent

.PHONY: help doctor env install setup dev dev-all dev-web dev-api dev-agent \
        test test-api test-agent typecheck build check docker-build docker-api docker-agent clean nuke

help: ## Muestra esta ayuda
	@echo "Uso: make <comando>"; echo
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## / {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ───────── Preparación ─────────
doctor: ## Comprueba que estén instaladas las herramientas y el .env
	@for t in node pnpm uv; do \
	  if command -v $$t >/dev/null 2>&1; then echo "ok     $$t $$($$t --version | head -1)"; else echo "FALTA  $$t"; fi; \
	done
	@if docker info >/dev/null 2>&1; then echo "ok     docker"; else echo "--     docker no disponible (opcional: solo para docker-build; en WSL activa la integración de Docker Desktop)"; fi
	@if [ -f .env ]; then echo "ok     .env"; else echo "FALTA  .env  ->  make env"; fi

env: ## Crea .env desde .env.example (si no existe)
	@if [ -f .env ]; then echo ".env ya existe"; else cp .env.example .env && echo "Creé .env: rellénalo con tus claves (nunca lo commitees)"; fi

install: ## Instala las dependencias (JS y Python)
	pnpm install
	uv --directory $(API) sync
	uv --directory $(AGENT) sync

setup: env install ## Primera vez: crea .env e instala todo

# ───────── Desarrollo ─────────
dev-web: ## PWA en http://localhost:3000
	pnpm --filter @puente/web dev

dev-api: ## API en http://localhost:8000 (Swagger en /docs)
	uv --directory $(API) run uvicorn app.main:app --reload --port 8000

dev-agent: ## Agente traductor (necesita LIVEKIT_* y las claves de IA en .env)
	uv --directory $(AGENT) run python agent.py dev

dev: ## Levanta web + API a la vez (Ctrl+C detiene ambos)
	@$(MAKE) -j2 --output-sync=line dev-web dev-api

dev-all: ## Levanta web + API + agente (requiere las claves del agente)
	@$(MAKE) -j3 --output-sync=line dev-web dev-api dev-agent

# ───────── Calidad (lo mismo que corre la CI) ─────────
typecheck: ## Typecheck de todos los paquetes TypeScript
	pnpm typecheck

build: ## Build de la PWA (export estático en apps/web/out)
	pnpm build

test-api: ## Tests de la API
	uv --directory $(API) run pytest -q

test-agent: ## Tests del agente y del traductor
	uv --directory $(AGENT) run pytest -q

test: test-api test-agent ## Todos los tests de Python

check: typecheck build test ## Typecheck + build + tests (antes de abrir un PR)

# ───────── Docker (se construye desde la raíz del repo) ─────────
docker-api: ## Construye la imagen de la API
	docker build -f $(API)/Dockerfile -t puente-api .

docker-agent: ## Construye la imagen del agente
	docker build -f $(AGENT)/Dockerfile -t puente-agent .

docker-build: docker-api docker-agent ## Construye ambas imágenes

# ───────── Limpieza ─────────
clean: ## Borra salidas de build y cachés (no toca las dependencias)
	rm -rf apps/web/.next apps/web/out .turbo apps/*/.turbo packages/*/.turbo services/*/.pytest_cache

nuke: clean ## Borra además node_modules y .venv (después: make install)
	rm -rf node_modules apps/*/node_modules packages/*/node_modules services/*/.venv
