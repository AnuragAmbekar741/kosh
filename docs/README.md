# Finance app documentation

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
3. **[product/scope.md](./product/scope.md)** — V1 scope and target API
4. **[product/BUILD_AND_LEARN.md](./product/BUILD_AND_LEARN.md)** — phase checklists and learning loop only
5. **[design/dashboard.md](./design/dashboard.md)** — when working on `apps/web`

Course notes (external): [Python for Professionals](https://python-pros.netlify.app/).

## Current progress

| Done | Next |
|---|---|
| uv workspace (`apps/api`, `packages/storage`, `packages/security`) | Local auth (register/login/refresh) |
| Postgres + Alembic; `User` model in storage | Pydantic request/response schemas |
| `GET /health` + tests | `apps/web` scaffold (pnpm) |

When a planning decision changes, update `architecture/decisions.md` first, then `architecture/overview.md` and `product/scope.md`.
