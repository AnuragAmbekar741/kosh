# Agent guidelines

- Read [docs/README.md](docs/README.md) first.
- Follow [`.cursor/rules/`](.cursor/rules/) — uv, alembic, ponytail, docs-for-agents, frontend.
- Python deps: `uv add`. Migrations: `alembic revision --autogenerate`.
- Frontend: `apps/web` (pnpm, not a uv member). Deps: `pnpm add` inside `apps/web` only.
- FE API: `src/api/<resource>/<resource>.ts` + `<resource>.types.ts`. Hooks: `src/hooks/<resource>/` (e.g. `hooks/health/use-health.ts`). See `.cursor/rules/frontend.mdc`.
