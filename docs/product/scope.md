# Product scope

Distilled from [BUILD_AND_LEARN.md](./BUILD_AND_LEARN.md) §§1–5, 12–16. Dashboard UX: [../design/dashboard.md](../design/dashboard.md). V1 only unless marked v2.

## Principle

```te
The Agent is NOT the application.
The Agent is one client on top of the same services as the dashboard.
```

```tex
Agent → Tool → Service/crud → Database
```

Never: `Agent → execute_sql() → Database`.

## V1 features

| Area | Scope |
|---|---|
| Auth | Email/password register & login; Google OAuth; JWT access + refresh rotation; logout; `GET /users/me` |
| Spend | CRUD on **SpendItem**; filter by date, category, merchant, source |
| Documents | Upload PDF/image/DOCX → async worker → draft SpendItems → user confirm |
| Overview | Totals, monthly spend, top merchants, recent spend (computed) |
| Dashboard | Collapsible sidebar shell; Overview + Spending. See [../design/dashboard.md](../design/dashboard.md) |
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
| POST | `/spend-items` | **live** |
| GET | `/spend-items` | **live** |
| GET | `/spend-items/summary` | **live** |
| GET | `/spend-items/analytics` | **live** |
| GET | `/spend-items/{id}` | **live** |
| PATCH | `/spend-items/{id}` | **live** |
| DELETE | `/spend-items/{id}` | **live** |
| POST | `/documents` | **live** |
| POST | `/documents/manual` | **live** |
| GET | `/documents` | **live** |
| GET | `/documents/{id}` | **live** |
| POST | `/documents/{id}/confirm` | **live** |
| POST | `/documents/{id}/line-items` | **live** |
| PATCH | `/documents/{id}` | **live** |
| DELETE | `/documents/{id}` | **live** |
| POST | `/agent/conversations` | **live** |
| GET | `/agent/conversations` | **live** |
| GET | `/agent/conversations/{id}` | **live** |
| POST | `/agent/conversations/{id}/messages` | **live** (SSE) |
| GET | `/overview` | planned |

Prefer `GET /users/me` over `GET /users/{id}` for profile.

`GET /spend-items` is the confirmed ledger. It returns `{data, total}` and accepts `skip` (default 0), `limit` (default 50, max 200), `spent_from`, `spent_to`, repeatable `category`, exact `merchant`, `source`, and `q` (case-insensitive contains on merchant or description). `GET /spend-items/summary` is the same confirmed slice plus `period` (`day` / `week` / `month` / `custom`): totals, bill/item counts, and optional month-over-month comparison. It is not paged. `GET /spend-items/analytics` takes the list filters (no paging) plus optional `currency` (default: the most used; currencies are never summed, and `currencies` lists all present), stops at today, and returns the stat-card numbers, a zero-filled trend (day / week / month buckets from the range length), category shares, top 5 merchants, top 5 bills, weekday totals, and a comparison with the previous period when both dates are set. Pending document items are returned by `GET /documents/{id}` until the user reviews them; `GET /documents?inbox=true` returns only the documents the user still has to wait for or act on (uploaded, processing, failed, or with pending items), newest first, at most 50: the web notification center polls it instead of the whole list. `POST /documents` refuses with 429 while the user already has `MAX_IN_FLIGHT_DOCUMENTS` (default 5) documents uploaded or processing; a retry of an upload that exists is not refused. `GET /documents` and `GET /documents/{id}` set `needs_review` while a document is still uploading or extracting, or has pending items (failed and manual documents are `false`); For a receipt with pending items, `GET /documents/{id}` also returns `bill_number` and up to 3 `possible_duplicates` (confirmed bills with the same merchant and bill number, marked `certain`, or the same merchant and total within a day). `POST /documents/{id}/confirm` confirms every pending item. `POST /documents/manual` creates a fileless bill from a title and optional `spent_at` (default today), kept on `Document.spent_at` until the bill has lines. `PATCH /documents/{id}` takes `spent_at` and moves the bill and every one of its lines to that date (409 while extracting). `POST /documents/{id}/line-items` appends a confirmed line to an itemized receipt bill or a manual bill. `DELETE /documents/{id}` removes the document, extraction history, linked spend items, and stored file (manual bills have no file).

`POST /agent/conversations/{id}/messages` takes `{text, document_ids}`: text up to 4000 characters, up to 5 bills uploaded with `POST /documents` (`source=agent`), at least one of the two. It streams server-sent events: `document` (`{id, status}`, while it waits up to 60 s for attached bills to be read), `tool` (`{name}`), `action` (a card for a bill the agent offers to save: `{tool, kind, document_id, merchant, spent_at, line_count, totals, possible_duplicates}`; nothing is saved until the user calls `POST /documents/{id}/confirm`), `delta` (`{text}`), `done` (`{message_id, run_id}`) or `error` (`{message, run_id}`). It refuses before streaming with 404 (not yours, including any attached bill), 409 (a reply is still running there), 429 (daily limit, `AGENT_DAILY_RUNS`, default 50, counted from midnight UTC, failed replies included) or 503 (no OpenRouter key). `GET /agent/conversations/{id}` returns the user's messages and text replies (no tool steps); each user message carries `document_ids` and `status` (`running` / `completed` / `failed`; a run older than 5 minutes that never finished shows as `failed`), and each reply carries the `actions` offered in its turn.

Spend lines also return `item` (`{id, name, family}` or null) and `item_status` (`none` / `pending` / `processing` / `resolved` / `needs_review` / `not_product` / `failed`). `GET /catalog/search?q=` searches the shared catalog plus the user's own items. `PUT /spend-items/{id}/item` sets a matched line's item: exactly one of `{catalog_item_id}`, `{new_item: {name, family_id}}` (a private item under a family), or `{not_product: true}`. The answer is saved for that text and store code, and the user's other lines with the same text follow.

## Auth flow (target)

- Access token: ~15 minutes, `Authorization: Bearer`; requires `exp` and `sub`; invalid/expired tokens return 401
- Refresh token: ~30 days, **httpOnly Secure cookie**, stored hashed server-side
- Refresh rotates and revokes the previous refresh token
- Google: POST an ID token to `/auth/google`; receive access + refresh tokens.
- New Google identity with an existing email: 409; account linking is not supported.
- Google key-service outage: 503.

## Document pipeline (target)

```text
POST /documents → store original file → Document row (uploaded)
  → worker claims (SKIP LOCKED) → inspect/normalize → OpenRouter
  → ExtractionAttempt + draft SpendItems → user confirm
```

States: `uploaded` → `processing` → `ready` | `failed`

Extraction answers one of three kinds (`SCHEMA_VERSION` 6): `receipt`, `statement`, or `not_a_bill` with a short `reason` when the file clearly isn't a bill (a photo of people, pets or places, a screenshot, a blank page). A non-bill is `failed` at once with `error` "This doesn't look like a bill: {reason}", no drafts and no retry; its attempt is kept for the token count. A blurry or partly cut bill is still a bill: readable lines are extracted and unclear ones marked for review.

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
