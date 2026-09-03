# Product scope

Distilled from [BUILD_AND_LEARN.md](./BUILD_AND_LEARN.md) §§1–5, 12–16. Dashboard UX: [../design/dashboard.md](../design/dashboard.md). V1 only unless marked v2.

## Principle

```text
The Agent is NOT the application.
The Agent is one client on top of the same services as the dashboard.
```

```text
Agent → Tool → Service/crud → Database
```

Never: `Agent → execute_sql() → Database`.

## V1 features

| Area | Scope |
|---|---|
| Auth | Email/password register & login; Google OAuth; JWT access + refresh rotation; logout; `GET /users/me` |
| Spend | CRUD on **SpendItem**; filter by date, category, merchant, source |
| Documents | Upload PDF/image/DOCX → async worker → draft SpendItems → user confirm |
| Overview | Totals, monthly spend, category breakdown, top merchants, recent spend (computed) |
| Dashboard | See [../design/dashboard.md](../design/dashboard.md) |
| Agent | Read/write spend via tools; confirm before destructive ops; doc status |
| WhatsApp | Text + media → same agent pipeline; link `wa_id` to user |

## V2 (do not block v1)

Plaid bank connections, bills, Splitwise — see [../architecture/decisions.md](../architecture/decisions.md).

## SpendItem (not Payment)

Manual entry, document extraction, and later Plaid rows are all `SpendItem` records with a `source` field.

## Target API catalog

Status key: **live** = implemented today.

| Method | Path | Status |
|---|---|---|
| GET | `/health` | **live** |
| POST | `/auth/register` | **live** |
| POST | `/auth/login` | **live** |
| POST | `/auth/google` | **live** |
| POST | `/auth/refresh` | **live** |
| POST | `/auth/logout` | **live** |
| GET | `/users/me` | **live** |
| POST | `/spend-items` | planned |
| GET | `/spend-items` | planned |
| GET | `/spend-items/{id}` | planned |
| PATCH | `/spend-items/{id}` | planned |
| DELETE | `/spend-items/{id}` | planned |
| POST | `/documents` | planned |
| GET | `/documents` | planned |
| GET | `/documents/{id}` | planned |
| POST | `/documents/{id}/confirm` | planned (optional) |
| GET | `/overview` | planned |

Prefer `GET /users/me` over `GET /users/{id}` for profile.

## Auth flow (target)

- Access token: ~15 minutes, `Authorization: Bearer`
- Refresh token: ~30 days, **httpOnly Secure cookie**, stored hashed server-side
- Refresh rotates and revokes the previous refresh token
- Google: client POSTs a Google ID token to `/auth/google`; same access + refresh as local login

## Document pipeline (target)

```text
POST /documents → store file → Document row → queue job
  → worker (PDF/OCR/DOCX + LLM) → SpendItem candidates → user confirm
```

States: `uploaded` → `processing` → `ready` | `failed`

## Agent tools (v1 starter set)

**Read:** `get_spending_summary`, `list_spend_items`, `get_spend_item`, `list_documents`, `get_document_status`

**Write:** `create_spend_item`, `update_spend_item`, `confirm_document_items`

**Destructive:** `delete_spend_item` — requires explicit user confirmation

Each tool: name, description, input schema, permissions, risk level, confirmation flag.

## Agent safety flow

```text
UNDERSTAND → PLAN → AUTHORIZE → CONFIRM (if required) → EXECUTE → VERIFY → RESPOND
```

Example: “Delete all Starbucks from last month” → list matches + totals → ask “Delete all 12?” → only then run delete tool.

## V1 complete checklist

User can register, log in (incl. Google), use protected dashboard, CRUD SpendItems, upload & confirm document extractions, view overview, chat with agent safely, and use WhatsApp — see BUILD_AND_LEARN §25 for full checklist.
