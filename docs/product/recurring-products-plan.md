# Recurring products — build plan

Status: **planned, not built.** When a phase lands, move its "why" into `architecture/decisions.md`, update `architecture/overview.md` / `product/scope.md`, and delete the finished phase from this file.

## Goal

Group receipt line items from different brands and stores under one product (for example `SILK UNSWT ALMOND 64OZ` → **Almond milk** → **Milk**). Show how often and how much the user buys each product. A user fixes a mistake once and it sticks.

Done when a user can upload or type bills, see lines grouped under the right product, correct one line and have similar lines follow, and read weekly counts that receipt totals, statement rows, and duplicate uploads do not inflate.

## Decisions this plan locks

Add each as a row in `architecture/decisions.md` in phase 0. The ones marked **(default)** are my choices. Change them before phase 1 if you disagree.

| # | Decision | Chosen | Rejected | Why |
|---|---|---|---|---|
| P1 | When to classify | On **confirm** of line items, on **add line**, and on **edit of description/merchant** of a confirmed line | On extraction (drafts) | Drafts are rewritten by `upsert_drafts`, abandoned, or never confirmed when the user picks *total* mode; classifying them wastes calls and produces stale results |
| P2 | What is a product line | A confirmed row on a **receipt** document with `line_index` set, or a line on a **manual bill** | Receipt total rows (`line_index` null), statement transactions, loose `POST /spend-items` rows **(default)** | `SpendItem` has no kind column; the confirm and add-line services already know the document kind, so eligibility = "an `ItemProduct` row was created". Loose rows have no bill, so they break "one bill = one purchase" |
| P3 | Concept catalog scope | **Per user** concepts and aliases; the model may create concepts **(default)** | Global shared catalog, seeded taxonomy | A correction must never change another user's data; a personal ledger has hundreds of concepts, not millions |
| P4 | Candidate retrieval | Send all of the user's concept names in the prompt | `pg_trgm` / embeddings | Fits in context at personal scale and keeps SQLite tests valid. `# ponytail:` revisit above ~400 concepts |
| P5 | Hierarchy | One optional `parent_id`, **one level** (Almond milk → Milk) | Arbitrary depth tree | Enough for "Milk" / "Chicken" roll-ups; no recursive queries |
| P6 | Queue | `ItemProduct.status` is the queue, claimed with `FOR UPDATE SKIP LOCKED` + claim token, **same worker loop**, extraction first | `packages/queue`, Redis, second process | Mirrors the document queue. This is the "second job" the queue-deferred row names, so record why a shared runtime is still not needed |
| P7 | Second model call | Text-only classification call, **one per bill** | Folding product identity into the vision call | Needs the user's concept list and runs again on edits/corrections without re-reading the image. Supersedes the "no second text-only call" reasoning for categories only for products |
| P8 | Duplicate uploads | Warn in the review dialog; the user deletes the duplicate with the existing bill delete **(default)** | `duplicate_of_id` state, silent exclusion | No new schema; the user explicitly decides; ledger totals get fixed too |
| P9 | UI location | Section on **Overview**; API under `/products` | New sidebar route; `/overview` endpoint | Overview is empty and is the analytics surface; `GET /overview` stays the later snapshot (decision 43) |
| P10 | Analytics compute | Per request in Python over the user's resolved lines | Summary tables | Same pattern as `GET /spend-items/summary` |

## Product rules

### Classification outcomes (`ItemProduct.status`)

| Status | Meaning | Counts in analytics |
|---|---|---|
| `pending` | Waiting for the worker | no |
| `processing` | Claimed by a worker | no |
| `resolved` | Linked to a concept | **yes** |
| `needs_review` | Model unsure; `suggested_name` shown to the user | no |
| `not_product` | Bag fee, deposit, discount, tax, service charge | no |
| `failed` | Retries exhausted | no, and shown in the review list |

### Resolver order (first hit wins)

1. `user_locked` → keep the user's answer, never overwrite.
2. UPC alias (only when the UPC is 12 or 13 digits and the check digit passes; otherwise ignore the UPC).
3. Text alias scoped to this merchant.
4. Text alias for any merchant, **from user corrections only**.
5. Model call (batched per bill):
   - match or new, confidence ≥ 0.8 → `resolved`, create a merchant-scoped `model` alias, and create the concept if new
   - not a product, confidence ≥ 0.8 → `not_product`
   - anything else → `needs_review` with `suggested_name`

Text key = casefold of `raw_description` (fall back to `description`), non-alphanumerics → space, whitespace collapsed. Merchant key = the same function applied to the merchant.

### Corrections

`PUT /products/items/{spend_item_id}` with one of `{concept_id}`, `{name, parent_id?}`, or `{not_product: true}`:

1. Sets the item to `resolved` / `not_product`, `method=user`, `user_locked=true`.
2. Upserts a **user** alias for the text key, both merchant-scoped and any-merchant. A user alias replaces a model alias with the same key.
3. Re-applies it synchronously to the user's other items with the same text key that are not `user_locked` (`method=alias`, no model call).

### Analytics definitions

- **Occurrence**: distinct `document_id` among resolved lines for the concept. For a parent, include its children's lines, and still count each bill once.
- **Window**: `?days=` (default 90). Weeks are ISO weeks (Monday start) on `spent_at`.
- **Weekly average**: occurrences ÷ weeks from the later of the window start and the concept's first purchase, through the current week. Weeks with no purchase count as zero.
- **Typical interval**: median days between consecutive occurrence dates. Show it only with at least 3 occurrences.
- **Recurring**: at least 3 occurrences in at least 2 distinct weeks inside the window.
- **Spend**: sum of line `amount`, **per currency**, never summed across currencies.
- **Quantity**: summed only when every line has the same `unit`; otherwise not shown. `# ponytail:` discount lines are `not_product`, so spend is pre-discount.
- **Brands / merchants**: top 3 by occurrence.

## Data model

All in `packages/storage/src/storage/models/product.py` except the `SpendItem` columns. One autogenerated Alembic migration (phase 1).

**`SpendItem` new columns** (line facts; they belong to the purchase, not the product): `raw_description: str | None`, `upc: str | None`, `quantity: Numeric(12, 3) | None`, `unit_price: Numeric(12, 2) | None`. `draft_mapper` fills them and `upsert_drafts` keeps them in sync.

**`ProductConcept`** (`product_concepts`): `id`, `user_id`, `name`, `name_key` (unique per user), `parent_id` (self FK, nullable, parent must have no parent), `created_by` (`user` | `model`), `created_at`.

**`ProductAlias`** (`product_aliases`): `id`, `user_id`, `kind` (`text` | `upc`), `merchant_key` (`""` = any merchant), `key`, `concept_id` (null means not a product), `source` (`user` | `model`), timestamps. Unique `(user_id, kind, merchant_key, key)`.

**`ItemProduct`** (`item_products`): `id`, `spend_item_id` (unique FK), `user_id`, `status`, `concept_id`, `method` (`user` | `alias` | `upc` | `model`), `confidence`, `brand`, `pack_size`, `unit`, `suggested_name`, `input_hash`, `user_locked`, `attempt_count`, `next_attempt_at`, `claim_token`, `claimed_at`, `error`, timestamps. Index `(status, next_attempt_at)`.

`input_hash` = sha256 of `(raw_description, description, upc, merchant)` at enqueue time. The worker only writes a result if the claim token **and** the recomputed hash still match; otherwise it puts the row back to `pending`.

### Delete paths (decision 40: explicit, no CASCADE)

Delete `ItemProduct` before its `SpendItem` in:
- `delete_document_tree` (`storage/crud/document.py`)
- `delete_spend_item` (`storage/crud/spend.py`)

`upsert_drafts` only touches `pending_review` rows, and those never have an `ItemProduct` (P1). Leave it unchanged, and add a test that pins this.

Deleting a concept is out of scope for v1. Renaming and re-parenting are in scope.

## Model call

`packages/ai/src/ai/products.py`, reusing the OpenRouter client and strict JSON schema helpers from `client.py`. Add `openrouter_product_model` to `ai/settings.py`, defaulting to `openrouter_model`.

Input: merchant, and per line: `ref`, `raw_description`/`description`, `quantity`, `unit_price`, `amount`. Also the user's concepts as `{id, name, parent_name}`.

Output per line (strict schema): `ref`, `outcome` (`match` | `new` | `not_product` | `unsure`), `concept_id` (for match), `new_name` and `parent_name` (for new; the parent may be an existing name or new), `brand`, `pack_size`, `unit` (`each` | `lb` | `kg` | `oz` | `g` | `l` | `ml` | `gal` | null), `confidence`.

The prompt tells the model to use short generic concept names ("Almond milk", not "Silk Unsweetened Almond Milk 64oz") and to prefer an existing concept over a near-duplicate. The worker also treats a `new_name` whose `name_key` already exists as a `match`.

## Worker

`apps/worker/src/worker/consumers/products/`:
- `consumer.py`: claim, finalize with the claim token + hash check
- `handler.py`: resolver order and model call

`main.py` loop: reclaim stuck work, claim a document; if none, claim one product batch; sleep only when both are empty.

- **Claim**: take the oldest `pending` row with `next_attempt_at <= now` (`SKIP LOCKED`), then claim the other pending rows of the same `document_id` so one bill makes one model call.
- **Retry**: a retryable model error increments `attempt_count` and sets `next_attempt_at = now + 2^n min`. After 3 attempts → `failed`. Rows stuck in `processing` for more than 10 minutes are reclaimed.
- **Logging**: one `products finished` line per batch with `document_id`, counts per status, and `duration_ms`. Never log descriptions, concept names, or amounts (logging decision).

Backfill: `python -m worker.backfill_products`. It enqueues confirmed lines that are eligible under P2 and have no `ItemProduct`, using `latest_attempt().payload["document_kind"] == "receipt"` or `source=manual`. It also re-queues `failed` rows. Run it once after phase 3, and again after a prompt change if you want.

## API — `apps/api/src/api/modules/products/`

| Method | Path | Returns |
|---|---|---|
| GET | `/products/recurring?days=90` | Recurring concepts: name, parent, occurrences, weekly average, typical interval, last purchased, spend per currency |
| GET | `/products/{concept_id}?days=90` | Weekly occurrence series, purchase list (date, merchant, raw text, amount, qty), top brands and merchants, children |
| GET | `/products/concepts?q=` | Concept search for the correction picker |
| PATCH | `/products/concepts/{id}` | Rename / set or clear parent |
| GET | `/products/review` | `needs_review` + `failed` items with suggestion (paginated with the `Page` mixin) |
| PUT | `/products/items/{spend_item_id}` | Correction (see above) |

Hooks into existing services (enqueue in the **same transaction** as the write):
- `documents/services/confirm.py`: when `mode == "line_items"` and the kind is `receipt`, create `pending` `ItemProduct` rows for the confirmed ids. `confirm_document_items` gets an optional list of ids to enqueue before its commit.
- `documents/services/add_line_item.py`: enqueue in both `_add_manual_line` and `_add_receipt_line`.
- `documents/services/confirm.py` for **manual** bills: their lines are created already confirmed, so the add-line hook covers them.
- `spend/service.py` `update`: if the item has an `ItemProduct`, is not `user_locked`, and `description` or `merchant` changed → reset to `pending` with a new hash.
- `documents` `GET /{id}`: add `possible_duplicate_of: {id, merchant, spent_at} | null`. This is another confirmed receipt of the same user with the same merchant key, the same `purchased_at`, and a payload `total` within 0.01. Computed, not stored.

## Web — `apps/web`

- `src/api/products/products.ts` + `products.types.ts`; hooks in `src/hooks/products/` (`use-recurring-products`, `use-product`, `use-product-review`, `use-correct-item-product`, `use-product-concepts`).
- **Overview page**: a "Recurring products" list (name, times per week, typical interval, last bought, spend) with a window switch (30/90/180 days), plus a "N items to review" entry. The empty state explains that products appear after confirming line items.
- **Product detail**: a sheet with a weekly bar chart, purchase list, brands, and merchants. Read the `dataviz` skill before building the chart.
- **Correction**: from the detail purchase list and the review list, a concept combobox (search + "Create …" + "Not a product"). Uses the one dialog width (decision 42).
- **Review dialog**: duplicate banner with "Delete this upload" (existing delete) / "Keep both". Also a hint next to *Confirm total*: "Confirm line items to track products".
- Add screens to `docs/design/` when built.

## Tests

SQLite per test (existing decision). `SKIP LOCKED` behavior stays untested there, as it is for documents today.

- storage: eligibility at confirm (total mode → none; statement → none; receipt lines → pending); delete paths; alias uniqueness; `upsert_drafts` never touches `ItemProduct`.
- worker: resolver order; stale hash → back to pending; claim lost → discarded; retry/backoff → failed; `new_name` duplicate → match; UPC check digit.
- api: correction locks the item and propagates to same-key items but not locked ones; edit resets to pending; analytics definitions (one bill counts once for parent and child, zero weeks, per-currency, interval needs 3); duplicate detection.
- **Labeled eval** (not in CI): `apps/worker/tests/fixtures/products_labeled.jsonl`, about 200 lines across dairy, eggs, meat cuts, produce by weight, cleaning, batteries, snacks, and non-product lines (bag fee, CRV, coupon, tax), from at least 5 merchants. `python -m worker.eval_products` prints accuracy and review rate. Build it in phase 2 and use it to gate the resolver.

**Ship targets**: ≥ 90% correct concept on the labeled set, ≤ 10% `needs_review`, 100% of non-product fixtures `not_product` or `needs_review`, and 0 totals or statement rows in analytics (guaranteed by P2 and covered by tests).

## Phases

Each phase ends with its tests passing and docs updated.

0. **Decisions**: add P1–P10 to `decisions.md`, and revise the "queue still deferred" and "categories" rows to point at P6/P7.
1. **Line facts + schema**: `SpendItem` columns, `draft_mapper` + `upsert_drafts` mapping, product models, ordered deletes, migration. *Check:* re-extracting a receipt keeps the UPC and raw text; deleting a bill with products succeeds.
2. **Resolver + consumer**: `ai/products.py`, worker consumer, loop change, retries, labeled set + eval script. *Check:* hitting the ship targets on the labeled set.
3. **Wiring**: confirm / add-line / edit hooks, backfill command. *Check:* confirming a receipt resolves its lines within a few worker ticks; editing a description re-resolves it.
4. **Corrections + analytics API**: `/products` module and duplicate detection on `GET /documents/{id}`. *Check:* one correction fixes all same-text lines; analytics tests pass.
5. **UI**: Overview section, detail sheet, review list, correction picker, duplicate banner, design doc.
6. **Real data pass**: run the backfill on your own history, go through the review list, re-run the eval with any misses added, and adjust the thresholds (0.8) if needed.

## Out of scope for v1

Loose `POST /spend-items` rows as products, shared/global catalog, concept delete/merge, price-per-unit trends, "you usually buy X by now" predictions, and statement-line product guesses.
