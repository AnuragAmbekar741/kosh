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
| 21 | Inner layout | `apps/api/src/api/routers/` + `api/auth.py`; `packages/storage/{models,crud}` |
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
| 32 | Identity layout | Domain modules `storage/models|crud` (`user.py`); auth orchestration in `apps/api`; Identity is in-process |
| 33 | HTTP layer | FastAPI routers + `api/auth.py` functions; no controller or repository classes |
| 34 | API startup | Load `DATABASE_URL` + `JWT_SECRET` and ping Postgres in lifespan; refuse to serve if either fails |
| 35 | Web HTTP client | **Axios + TanStack Query** in `apps/web`; types in `src/api/<resource>/<resource>.types.ts` |
| 36 | Web design craft | **Impeccable** locally (gitignored root files); committed visual system is `docs/design/` + Linear dark + ice blue |
| 37 | Dev Postgres host | **Neon** project `kosh` (direct `DATABASE_URL`); Docker Postgres is optional fallback |

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

**Auth identities vs User**

- Chosen: Separate `AuthIdentity` from `User`; `RefreshSession` with hashed tokens
- Rejected: `User.password_hash` on `users`
- Why: Guide §23; supports OAuth + multiple login methods
- Revision 435 does **not** backfill old hashes — local DB is disposable; re-register
- Revisit when: an authenticated account-linking feature is implemented

**Identity context in-process**

- Chosen: models/crud in storage; register/login/google/refresh/logout in `apps/api/auth.py`
- Rejected: Auth HTTP service, database-per-service, API gateway, `UserService` class, storage importing security
- Why: Decision #5/#9/#16; one-way `api → security → storage`
- Revisit when: Independent scaling forces a split

**Web HTTP: axios + TanStack Query in-app**

- Chosen: `pnpm add axios @tanstack/react-query` in `apps/web`; one axios instance with interceptors; hooks wrap endpoints
- Rejected: Hand-rolled `fetch` wrappers; day-one OpenAPI / `packages/api-client`
- Why: Auth cookie + Bearer retry is one interceptor; Query handles cache/`enabled`/`signal`. One web app — no second consumer yet
- Revisit when: a second TS client or generated OpenAPI types are needed

**Impeccable for UI craft, not a new look**

- Chosen: Impeccable root files (`PRODUCT.md`, `DESIGN.md`, `.impeccable/`) stay gitignored. Committed source of truth is `docs/design/`.
- Rejected: Committing the skill install, hook manifests, or root Stitch files (duplicates `global.md` and bloated the working tree)
- Why: Impeccable still reads the local copies; git should only carry the design docs we already maintain
- Revisit when: a deliberate rebrand is requested

**Google sign-in: ID token at `POST /auth/google`**

- Chosen: Verify Google tokens with PyJWT (JWKS + client ID); issue local access/refresh tokens. Identify users by Google `sub`; reject email-only matches with 409.
- Rejected: Email-only linking, redirect flow, separate auth service/library
- Why: Prevent password access from an unverified local registration carrying over to Google sign-in.
- Revisit when: Authenticated account linking or server redirects are needed.

Previously linked accounts are unchanged; review them separately if used with real users.

**Test database**

- Chosen: Temporary SQLite database per test
- Rejected: Development database
- Why: Isolated, repeatable tests
- Revisit when: Testing PostgreSQL migrations or row locks

**Dev Postgres host**

- Chosen: Neon project `kosh` (direct `DATABASE_URL`) for local/dev
- Rejected: Requiring docker compose Postgres for daily work
- Why: Same protocol; no local daemon; project already exists
- Revisit when: Offline work or a disposable local DB is needed

**CORS: explicit origins + credentials**

- Chosen: `CORSMiddleware` with `CORS_ORIGINS` (default `http://localhost:5173` and `http://127.0.0.1:5173`) and `allow_credentials=True`. Empty `VITE_API_URL` still uses the Vite proxy.
- Rejected: `allow_origins=["*"]` with credentials; SameSite=None for local
- Why: Refresh cookie is credentialed; wildcard origins cannot pair with credentials. Localhost ports are same-site.
- Revisit when: web and API are on different sites (needs `SameSite=None; Secure`)

**Web auth forms: RHF + zod**

- Chosen: `react-hook-form` + `@hookform/resolvers` + zod; `FieldError` for field and API `detail`
- Rejected: Uncontrolled `preventDefault` forms; sonner for auth errors
- Why: Matches existing Field `errors` shape; password min 8 only on signup (API `RegisterRequest`)
- Revisit when: shared form primitives or toasts are needed beyond auth

**Google on the web: GIS ID token**

- Chosen: Load `accounts.google.com/gsi/client`, `renderButton`, POST `{ id_token }` to `/auth/google`. Hide the control when `VITE_GOOGLE_CLIENT_ID` is empty.
- Rejected: `@react-oauth/google`, redirect OAuth, and custom-button click hacks.
- Why: Same ID-token contract as the API; no extra OAuth library. Google does not expose an API that lets a custom web button programmatically initiate the GIS button flow, so the official renderer remains the reliable path. Its supported theme, shape, text, alignment, and width options are configured to match the app as closely as Google branding rules allow.
- Revisit when: One Tap or a custom-branded button is required

## Open

| Topic | Notes |
|---|---|
| Makefile vs raw commands | Root `makefile` exists; not required for agents |
| Dashboard chrome | `/` is a signed-in stub (email + logout). SpendItem UI next. |
| `packages/ui` / `api-client` | Defer until second consumer or OpenAPI codegen need |

## Rejected / deferred (v2+)

| Topic | Why deferred |
|---|---|
| Plaid / bank sync | v2; `source=plaid` when added |
| Bills management | After v1 ledger stable |
| Splitwise | After v1 ledger stable |
| Turbo monorepo | uv + pnpm split is enough for v1 |
| Microservices | See locked row above |

**Auth background motion**

- Chosen: One theme-aware auth canvas with the brand story on the left and form on the right. A low-contrast ice-blue waveform crosses both sides without a dividing border; the form enters as a short, staggered Framer Motion sequence and reduced-motion users receive a static composition.
- Rejected: The previous light panel on the right; WebGL shaders, particle vortexes, collision effects, and copied component-library backgrounds.
- Why: The waveform suggests bills and spending moving into an organized record while keeping authentication calm, lightweight, and readable. Reduced motion keeps the artwork static.
- Revisit when: Motion is shared by other surfaces.

**Web heading type**

- Chosen: Geist for headings, UI, and body copy. Raleway and Nunito Sans remain scoped to the future changelog typeset surface only.
- Rejected: Mixed app-chrome families and adding another font dependency.
- Why: The approved brand reference specifies Geist throughout the product UI, and a single family creates a clearer foundation for future screens.
- Revisit when: The product receives a broader typography redesign.
