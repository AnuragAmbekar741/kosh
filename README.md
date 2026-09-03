# Finance

Personal finance app — spend ledger, dashboard, and (later) WhatsApp agent.

Modular monolith: `apps/api` + `packages/storage` + `packages/security`.

## Setup

Requires [uv](https://docs.astral.sh/uv/) and Python 3.14+.

**Dependencies:** use `uv add` only — see [.cursor/rules/uv-workflow.mdc](.cursor/rules/uv-workflow.mdc).

```bash
uv sync --all-packages
```

Verify workspace:

```bash
uv run python -c "import storage; import security; import api"
uv tree --package api
```

## Workspace members

| Path | Role |
|---|---|
| `apps/api` | Main FastAPI app |
| `packages/storage` | SQLModel models and crud |
| `packages/security` | Auth helpers |

## Infra (Postgres)

Requires [Docker](https://docs.docker.com/get-docker/).

```bash
docker compose up -d
cp .env.example .env
uv run --directory apps/api alembic upgrade head
```

Postgres listens on `localhost:5432` (user/db/password: `finance`). Migrations run from `apps/api` — see [.cursor/rules/alembic-migrations.mdc](.cursor/rules/alembic-migrations.mdc).

Google login (`POST /auth/google`) needs `GOOGLE_CLIENT_ID` in `.env` (Web client ID from Google Cloud Console). Local email/password works without it.

## Run API

From repo root:

```bash
uv run --directory apps/api fastapi dev --port 8000
```

Or from `apps/api/`:

```bash
cd apps/api && uv run fastapi dev --port 8000
```

- Health: http://127.0.0.1:8000/health
- OpenAPI docs: http://127.0.0.1:8000/docs

```bash
uv run --group dev pytest apps/api/tests -q
```

## Add a dependency

```bash
uv add --package storage sqlmodel
uv add --package api storage security
uv add --group dev pytest
```
