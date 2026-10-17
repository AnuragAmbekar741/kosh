# Kosh

Personal finance app: a spend ledger built from uploaded documents (receipts, statements) and manual entry, a React dashboard with spending analytics, and a chat agent over the same backend. WhatsApp is planned.

Modular monolith: one API, one background worker, shared packages. Docs start at [docs/README.md](docs/README.md).

## Workspace members

| Path | Role |
|---|---|
| `apps/api` | FastAPI app: auth, spend, documents, analytics, agent chat |
| `apps/worker` | Background document extraction (polls the DB, calls OpenRouter) |
| `apps/web` | React + Vite + shadcn dashboard (pnpm, not a uv member) |
| `packages/storage` | SQLModel models, crud, product catalog loader |
| `packages/ai` | OpenRouter client, image/PDF normalize, extraction schemas, chat model call |
| `packages/security` | Auth helpers |
| `packages/observability` | Shared logging setup |
| `evals` | Dev-only agent quality suite (never deployed) |

## Setup

Requires [uv](https://docs.astral.sh/uv/), Python 3.14+, [Docker](https://docs.docker.com/get-docker/) and [pnpm](https://pnpm.io/).

**Dependencies:** use `uv add` only — see [.cursor/rules/uv-workflow.mdc](.cursor/rules/uv-workflow.mdc). Frontend deps: `pnpm add` inside `apps/web`.

```bash
make setup      # copies .env.example to .env, uv sync --all-packages
pnpm --dir apps/web install
make db-up      # Postgres 16 on localhost:5432 (user/db/password: finance)
make migrate    # alembic upgrade head
make catalog    # load the product catalog
```

Migrations run from `apps/api` — see [.cursor/rules/alembic-migrations.mdc](.cursor/rules/alembic-migrations.mdc). Create one with `make migrate-new MSG="describe change"`.

## Configuration

Edit `.env` (see [.env.example](.env.example) for every variable):

- `DATABASE_URL`, `JWT_SECRET` — required. Defaults point at the local Docker Postgres.
- `GOOGLE_CLIENT_ID` — needed for `POST /auth/google`. Local email/password works without it.
- `OPENROUTER_API_KEY` (and optionally `OPENROUTER_MODEL`, `OPENROUTER_AGENT_MODEL`) — needed for extraction and the chat agent. The API starts without it; extraction fails until it is set.
- `AWS_*`, `DOCUMENTS_BUCKET` — S3-compatible object storage for uploaded documents.

## Run

Start the web app, API and extraction worker together:

```bash
make dev
```

Or individually:

```bash
make api      # http://127.0.0.1:8000 — /health, /docs
make worker   # extraction worker
make web      # Vite dev server on http://localhost:5173
```

Uploads are accepted by the API alone, but only the worker processes them: it sends document contents to the extraction provider configured in `.env`.

### On your phone

```bash
make dev-phone   # same as make dev, but Vite listens on your network
```

`dev:phone` clears `VITE_API_URL`, so the phone calls the API through the Vite proxy on the same address. The API stays on `127.0.0.1`.

- **Same Wi-Fi:** open `http://<your-mac-ip>:5173` on the phone (`ipconfig getifaddr en0` prints the IP). Sign in with email and password, since Google sign-in only works on `localhost` or HTTPS. Keep `COOKIE_SECURE` unset (it defaults to off) so the refresh cookie works over http. The camera and photo picker work here.
- **HTTPS, anywhere (Tailscale):** install Tailscale on the Mac and the phone, sign both in to the same tailnet, then run `tailscale serve --bg 5173`. Open the printed `https://<mac>.<tailnet>.ts.net` address on the phone. Only your own devices can reach it. Over HTTPS, Google sign-in also works once that address is added to the Google client's authorised JavaScript origins, and so does Add to Home Screen. `tailscale serve --https=443 off` stops it.
- **Install it (home screen):** over the HTTPS address, Android Chrome: menu → **Install app** (or **Add to Home screen**); iPhone Safari: Share → **Add to Home Screen**. Kosh then opens full screen with its own icon, and the status bar follows the app's theme. Over plain `http://<ip>` the phone only adds a bookmark that opens in the browser.

## Test

```bash
make test     # api, worker, storage, ai and evals unit tests
```

Tests use temporary SQLite databases and run API startup/shutdown; no `.env` or external services needed. Live-model tests are marked `llm` and skipped by default. PostgreSQL migrations and row locks need separate integration tests.

```bash
make evals                      # chat agent against a real model — costs money
make evals ARGS="--repeat 1 --only dates"
```

Frontend checks: `pnpm --dir apps/web typecheck`, `lint`, `build`.

## Add a dependency

```bash
uv add --package storage sqlmodel
uv add --package api storage security
uv add --group dev pytest
```

Run `make help` for the full list of targets.
