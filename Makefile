.DEFAULT_GOAL := help
COMPOSE := docker compose
PROD := docker compose -f compose.yaml -f compose.lightsail.yaml

.PHONY: help up down logs status build dev-web test deploy deploy-down deploy-logs deploy-status backup

help: ## List available commands
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## / {printf "  make %-16s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Build and start the full app at http://localhost:8000
	$(COMPOSE) up -d --build --wait

down: ## Stop local containers, preserving the database volume
	$(COMPOSE) down

logs: ## Follow local backend logs
	$(COMPOSE) logs -f --tail=100

status: ## Show local container state
	$(COMPOSE) ps

build: ## Build the React + FastAPI production image
	$(COMPOSE) build

dev-web: ## Run React with hot reload; start the containerized API with make up first
	npm run dev

test: ## Run API tests in a disposable backend container and temporary database
	$(COMPOSE) run --build --rm --no-deps --user root -v "$(CURDIR)/tests:/app/tests:ro" -v "$(CURDIR)/requirements-dev.txt:/app/requirements-dev.txt:ro" app sh -c 'pip install --no-cache-dir -r requirements-dev.txt && python -m unittest discover -s tests -v'

deploy: ## Run on your Lightsail instance: build and start with automatic HTTPS
	$(PROD) up -d --build --wait

deploy-down: ## Stop production containers without deleting data or certificates
	$(PROD) down

deploy-logs: ## Follow Lightsail application and proxy logs
	$(PROD) logs -f --tail=100

deploy-status: ## Show production container state
	$(PROD) ps

backup: ## Write a consistent SQLite backup into ./backups from the running app
	@mkdir -p backups
	$(COMPOSE) exec -T app python -c 'import os, sqlite3; source=sqlite3.connect(os.environ["DATABASE_PATH"]); target=sqlite3.connect("/data/folio-backup.sqlite3"); source.backup(target); target.close(); source.close()'
	$(COMPOSE) cp app:/data/folio-backup.sqlite3 "backups/folio-$$(date +%Y%m%d-%H%M%S).sqlite3"
