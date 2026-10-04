# Kosh documentation

Personal finance app: spend ledger from documents and manual entry, React dashboard, overview analytics, and (later) WhatsApp + an agent over the same backend.

**Architecture:** modular monolith — one main API (`apps/api`), shared data layer (`packages/storage`), optional worker/agent/whatsapp processes.

## Folders

| Folder | Use |
|---|---|
| [architecture/](./architecture/) | Repo layout, decisions, technical shape |
| [product/](./product/) | V1 scope, API catalog, full build roadmap |
| [design/](./design/) | Dashboard routes and UX (add screens when built) |

## Reading order (coding tasks)

1. **[architecture/decisions.md](./architecture/decisions.md)** — locked tradeoffs; do not fight them
2. **[architecture/overview.md](./architecture/overview.md)** — put code in the right package
3. **[architecture/agent.md](./architecture/agent.md)** — chat agent v1: auth, tools, pending actions, schema, evals
4. **[architecture/backend.md](./architecture/backend.md)** — layering inside `apps/api` and `apps/worker`; [implementation.md](./architecture/implementation.md) is the phased move to it
5. **[product/scope.md](./product/scope.md)** — V1 scope and target API
6. **[product/BUILD_AND_LEARN.md](./product/BUILD_AND_LEARN.md)** — phase checklists and learning loop only
7. **[design/global.md](./design/global.md)** — when working on `apps/web`

Course notes (external): [Python for Professionals](https://python-pros.netlify.app/).

## Current progress

| Done | Next |
|---|---|
| uv workspace + `apps/web` (Vite, shadcn, typeset CSS) | Agent — [product/agent-plan.md](./product/agent-plan.md) |
| Web auth plus document upload, extraction review, and Payments | Item analytics (recurring items) |
| Manual spend entry (name-only bill + line items) | |
| Postgres + Alembic; User, AuthIdentity, RefreshSession | |
| Local auth + Google (`POST /auth/google`) + `GET /users/me` | |
| SpendItem CRUD | |
| Spending analytics (`/spending/analytics`) | |
| Documents upload + worker extraction via OpenRouter | |


When a planning decision changes, update `architecture/decisions.md` first, then `architecture/overview.md` and `product/scope.md`.
