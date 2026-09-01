# Decisions

Tradeoff log for agents and humans. Format for new rows:

```
Decision: ...
Chosen: ...
Rejected: ...
Why: ...
Revisit when: ...
```

## Locked

| # | Topic | Decision |
|---|---|---|
| 1 | Repository | One git repo |
| 2 | Turbo | Not on day one |
| 3 | Python tooling | Root **uv** workspace, one `uv.lock` |
| 4 | Frontend tooling | **pnpm** only inside `apps/web` |
| 5 | Backend topology | **Modular monolith** — `apps/api` router modules; not separate auth/spend HTTP services |
| 6 | ORM / migrations | **SQLModel + Alembic**; models in `packages/storage`; Alembic under `apps/api` |
| 7 | Frontend | React (Vite) |
| 8 | v1 product scope | Auth, spend CRUD, docs → draft items, overview; WhatsApp/agent later; no Plaid/bills/Splitwise in v1 |
| 9 | Database | **One Postgres**, one schema; FKs allowed |
| 10 | File storage | **MinIO/S3** for blobs; metadata in `documents` table (later) |
| 11 | Main API | **`apps/api` :8000** — auth, spend, overview, documents routers |
| 12 | Day-one members | `apps/api`, `packages/storage`, `packages/security` |
| 13 | Shared data layer | **`packages/storage`** — SQLModel + crud; imported by api, worker, agent |
| 14 | Shared auth layer | **`packages/security`** — password hash, JWT issue/verify, `CurrentUserDep` |
| 15 | Auth pattern | `get_current_user` loads `User` from DB in same process (course ch 10) |
| 16 | API gateway | **No gateway on day one** |
| 17 | Background processes | `worker`, `agent`, `whatsapp` — separate deployables later |
| 18 | WhatsApp identity | Webhook signature + `channel_accounts` (`wa_id` → `user_id`) |
| 19 | Agent safety | `user_id` injected by runtime; confirm before mutating/destructive writes |
| 20 | Build order | storage + security → api → web → worker/documents → agent/whatsapp |
| 21 | Inner layout | `apps/api/src/api/routers/`; `packages/storage/src/storage/` |
| 22 | Deploy unit | Docker image per runnable app; packages baked in |
| 23 | Python dependencies | **`uv add` only** — see `.cursor/rules/uv-workflow.mdc` |
| 24 | Migrations | **`alembic revision --autogenerate`** — see `.cursor/rules/alembic-migrations.mdc` |
| 25 | Domain naming | **`SpendItem`**, not `Payment`, for v1 ledger rows |
| 26 | Overview | Computed read model first, not a dedicated table |
| 27 | Agent data access | Tools → services/crud, never raw SQL |
| 28 | Refresh tokens | Stored **hashed** server-side; browser refresh via **httpOnly Secure cookie** |
| 29 | Access token | Short-lived (~15 min) JWT in `Authorization` header |
| 30 | Guide vs repo paths | Do not scaffold `apps/api/app/` from BUILD_AND_LEARN — use storage + routers |
| 31 | Doc layout | `docs/architecture/`, `docs/product/`, `docs/design/` |

### Locked detail rows

**Modular monolith over microservices**

- Chosen: One API process with router modules + shared `packages/storage`
- Rejected: Separate auth/payments/documents HTTP services on day one
- Why: Simpler deploy, one DB schema, shared crud for worker/agent
- Revisit when: Independent scaling or team boundaries force a split

**SpendItem not Payment**

- Chosen: `SpendItem` for manual, document, and (v2) Plaid-sourced rows
- Rejected: `Payment` as the core v1 entity
- Why: v1 is ledger/analytics, not money movement
- Revisit when: Plaid or bill-pay needs distinct semantics

**Auth identities (guide) vs current User model**

- Chosen (target): Separate auth identities from `User`; refresh sessions table; hashed refresh tokens
- Current code: `User.password_hash` on `users` table — **temporary until auth slice**
- Why: Guide §23; supports OAuth + multiple login methods
- Revisit when: Starting Phase 3 auth — migrate in one Alembic revision

## Open

| Topic | Notes |
|---|---|
| Google OAuth | After local email/password auth works |
| Makefile vs raw commands | Root `makefile` exists; not required for agents |
| `apps/web` timing | After auth API contracts or in parallel once `/health` wired |
| `packages/ui` / `api-client` | Defer until second consumer or OpenAPI codegen need |

## Rejected / deferred (v2+)

| Topic | Why deferred |
|---|---|
| Plaid / bank sync | v2; `source=plaid` when added |
| Bills management | After v1 ledger stable |
| Splitwise | After v1 ledger stable |
| Turbo monorepo | uv + pnpm split is enough for v1 |
| Microservices | See locked row above |
