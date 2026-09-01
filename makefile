.PHONY: help db-up db-down migrate migrate-new test api setup git-config

help:
	@grep -E '^[a-zA-Z_-]+:' Makefile | cut -d: -f1 | sort

db-up:
	docker compose up -d

db-down:
	docker compose down

migrate:
	uv run --directory apps/api alembic upgrade head

migrate-new:
	@test -n "$(MSG)" || (echo 'Usage: make migrate-new MSG="describe change"' && exit 1)
	uv run --directory apps/api alembic revision --autogenerate -m "$(MSG)"

test:
	uv run --group dev pytest apps/api/tests -q

api:
	uv run --directory apps/api fastapi dev --port 8000

setup:
	cp -n .env.example .env || true
	uv sync --all-packages

git-config:
	git config --global user.name "AnuragAmbekar741"
	git config --global user.email "anuragambekar1997@gmail.com"