# Categories and items — final build plan

Status: **step 1 done** in [#24](https://github.com/AnuragAmbekar741/kosh/pull/24); **step 2 planned.** Step 2 builds on the #24 branch and both merge to `main` together. As parts land, move their "why" into `architecture/decisions.md`, update `architecture/overview.md` and `product/scope.md`, and delete this file when done.

## 1. The system in one picture

```
Spend row (every row)         category   ← SHOWN: badges, filters, spend mix
  └─ receipt line only        item       ← HIDDEN: "what do I buy, how often"
       family → item

"ORG BNLS SKNLS CHX BRST"  $11.84
   category: Groceries            (visible)
   item:     Chicken breast       (hidden; family Chicken)
   details:  brand Kirkland · 2.9 lb
```

- **Category**: one of 14 fixed values, on every spend row, assigned when the bill is read.
- **Item**: from our catalog (shared starter list + items learned per user), only on confirmed receipt lines. When a line gets an item, its category is taken from the item, unless the user set the category themselves.
- **Analytics**: spend mix by category (all rows); frequency, spend, brands, and stores by item and family (receipt lines).

## 2. Step 1 — remove the current category system

Done in [#24](https://github.com/AnuragAmbekar741/kosh/pull/24): the extraction schema and prompt, `spend_items.category` (migration `6c91ca7d00dd`), API filters, fields, and summary mix, web badges, filters, and tints, and the related tests and docs are all removed. The dev database was reset onto the new head.

## 3. Step 2 — the new system

### 3.1 Categories (visible, fixed, in code)

| Category | Covers |
|---|---|
| Groceries | food and drink bought to take home |
| Dining out | restaurants, cafes, delivery, bars |
| Household | cleaning, paper goods, batteries, kitchen supplies |
| Personal care | toiletries, cosmetics, haircuts |
| Health | pharmacy, doctors, vitamins, fitness |
| Baby & kids | diapers, formula, kids' items |
| Pet | pet food, litter, vet |
| Shopping | clothing, electronics, gifts, general goods |
| Transport | fuel, transit, rideshare, parking |
| Housing | rent, mortgage, repairs, furniture |
| Utilities | power, water, internet, phone |
| Entertainment | streaming, events, games |
| Travel | flights, hotels, car rental |
| Other | anything else |

- **Defined in code, not in a table**, because a new category also needs prompt rules and a color, and those are code changes.
- `storage/models/category.py` holds a `Category` StrEnum: the source for the API and the storage column.
- `ai/schemas.py` holds the same values as a `Literal` for the extraction schema; `ai` does not depend on `storage`. A worker test asserts that the two match.
- `web/src/lib/categories.ts` holds labels and tint tokens.

**Who sets the category:**

| Row | Set by | `category_source` |
|---|---|---|
| Any extracted row (receipt lines, statement rows) | Vision extraction, immediately | `extraction` |
| Receipt line once its item resolves | The item's family category | `item` |
| Manual entry, or any row the user edits | The user (required on manual entry) | `user`; never overwritten |

### 3.2 Items (hidden, from our catalog)

**Two levels:** family (Chicken, Laundry detergent) → item (Chicken breast, Chicken thighs). A vague line such as `CHICKEN 2.1LB` resolves to the family itself.

**Type vs detail:** an item is what you'd write on a shopping list. Brand, size, organic, flavor, and scent are details on the line, not new items.

**Where items live:**

| What | Stored | Changes by |
|---|---|---|
| Starter catalog: ~150 families, ~1,000 items, each family with a category, each row with alternative names and receipt abbreviations | Source of truth: `storage/catalog/catalog.csv` in git. Loaded into the `catalog_items` table | Editing the CSV + `python -m storage.catalog load` (safe to re-run; upserts by slug; removed rows are marked retired, never deleted) |
| Learned items (per user, private) | `catalog_items` with `user_id` set | The worker (new item under an existing family) or user corrections |
| Saved answers (receipt text / store code → item) | `catalog_aliases`, per user | Confident model answers and user corrections |

The app **never reads the CSV at runtime**. The API and worker read Postgres; the worker keeps the compact catalog list in memory until the catalog version changes.

**How the starter catalog is built (offline, once, then maintained):**
1. Families modeled on **GS1 GPC**, the retail classification standard (food and non-food). Used as reference only; its terms are checked before use.
2. Items drafted by the model per family in shopping-list style, with alternative names ("chx thigh", "TP"), then **reviewed by hand**.
3. Alternative names and test lines taken from **USDA FoodData Central** product names (public domain).
4. Nothing is imported and no outside service is called at runtime. Raw downloads stay in a gitignored folder; `storage/catalog/SOURCES.md` records each source and its license. Open Food Facts is reference-only (ODbL share-alike).
5. **Coverage gate:** ≥ 75% of labeled real receipt lines match a starter item without creating anything new.

### 3.3 When classification happens

```
upload ─► vision extraction ─► draft rows WITH category (14 values)   item_status = none
review / edit / re-extract ─► only drafts change                       (no item work)

confirm a receipt   ─► all lines confirmed + item_status = pending   (same transaction)
confirm a statement ─► all rows confirmed with category only       (no items)

worker (next tick, extraction first) claims pending lines of one bill (SKIP LOCKED):
  1. saved answers: user lock → store code (per merchant) → valid UPC → text (per merchant) → text (any merchant, user-made only)
  2. remaining lines: ONE model call per bill with the compact catalog
       "Chicken: breast, thighs, wings, drumsticks, ground, whole | Milk: whole, 2%, almond, oat | ..."
     → pick item / family, propose new item under an existing family, not a product, or unsure
  3. new-item check in code:
       name or alternative name already exists       → use it
       ≥ 0.85 similar to a sibling (difflib)         → needs_review, suggest sibling
       brand-new family proposed                     → needs_review
       confidence < 0.8                              → needs_review
       otherwise                                     → create private item for this user
  4. write only if the line's input hash is unchanged; set category from the item unless category_source = user
       resolved │ needs_review │ not_product │ failed (after 3 retries with backoff)
```

**Every entry point:**

| Event | Effect |
|---|---|
| Receipt confirmed (always itemized) | Lines → `pending`; statements are told apart by the attempt's `document_kind` |
| Line added to a confirmed receipt or manual bill | New line → `pending` |
| Description or merchant edited on a tracked line | → `pending` unless `item_locked` |
| Category edited | `category_source = user`; item untouched |
| User picks the item for a line | Set now, `item_locked`, alias saved, same-text lines updated in the same request |
| Line or bill deleted | Nothing extra: item fields live on the line |
| Catalog CSV updated | `load` command; existing lines are not reclassified |

Not a product (never counted): bag fee, deposit/CRV, coupon, discount, tax, tip, service or delivery fee, subtotal/total, gift card.

### 3.4 Data model (one autogenerated migration)

**`spend_items`**, new columns:
- Line facts: `raw_description`, `item_code` (extraction field `upc`; often a store code), `quantity numeric(12,3)`, `unit_price numeric(12,2)`
- Category: `category` (text, one of the 14), `category_source` (`extraction`|`item`|`user`)
- Item: `catalog_item_id` (FK, null), `item_status` (`none`|`pending`|`processing`|`resolved`|`needs_review`|`not_product`|`failed`), `item_locked`, `item_hash`, `item_attempts`, `item_next_attempt_at`, `item_claimed_at`, `item_suggestion` (JSON), `brand`, `pack_size`, `unit`
- Index `(item_status, item_next_attempt_at)`

**`catalog_items`**: `id`, `user_id` (null = shared starter), `parent_id` (family, null for families), `slug` (starter only, unique), `name`, `name_key`, `synonyms` (JSON), `category` (on families; items inherit it), `retired`, `created_at`. Unique `(user_id, parent_id, name_key)`.

**`catalog_aliases`**: `id`, `user_id`, `kind` (`text`|`code`|`upc`), `merchant_key` (`""` = any), `key`, `catalog_item_id` (null = not a product), `source` (`user`|`model`), timestamps. Unique `(user_id, kind, merchant_key, key)`.

Deletes need no new ordering: the item fields live on `spend_items`, and aliases point at catalog rows, never at lines.

### 3.5 Analytics

**Spend (every row, rebuilt on the new list):** the spending page's category mix, filter, and badges work as before, now with 14 categories.

**Items (resolved receipt lines, per request in Python):**
- **Purchase** = one bill containing the item. A family counts a bill once even if it has breast and thighs.
- **Window** `?days=30|90|180|365` (default 90), ISO weeks.
- **Per week**: occurrences ÷ weeks from the later of the window start and the first purchase, through this week. Weeks with no purchase count as zero.
- **Typical interval**: median gap; needs at least 3 purchases.
- **Recurring**: at least 3 purchases in at least 2 weeks.
- **Money**: per currency, never summed across currencies.
- **Quantity**: summed only when all lines share a unit.

**Recurring list rule:** show every recurring item, plus its family when the family is recurring and adds information (no single item is recurring, or the family is bought more often than its busiest item). Family rows expand into their items.

| v1 metric | Question |
|---|---|
| Recurring items (rule above) | What do I buy regularly? |
| Per week, typical interval, last bought | How often, and is it normal? |
| Spend in window, average per purchase | What does it cost? |
| Quantity (same unit) | How much do I go through? |
| Weekly bars | Pattern over time |
| Top brands and stores | Which brand, which store? |
| Family breakdown | Breast vs thighs vs ground |
| Needs-review count | What needs my input? |

Later, with no new data needed: due-soon alerts, brand switching, new/dropped items, basket per trip. Unit-price trends need `pack_size` parsing first.

### 3.6 API

| Method | Path | Purpose |
|---|---|---|
| GET | `/spend-items`, `/spend-items/summary` | Rebuilt `category` filter and mix (14 values) |
| PATCH | `/spend-items/{id}` | `category` editable again → `category_source = user` |
| PUT | `/spend-items/{id}/item` | Set a line's item: `{catalog_item_id}`, `{new_item: {name, family_id}}`, `{new_family: {name, category}}`, or `{not_product: true}` |
| GET | `/catalog/search?q=` | Picker: starter + own families and items, including alternative names |
| GET | `/insights/recurring?days=90` | Recurring items and families |
| GET | `/insights/items/{catalog_item_id}?days=90` | Weekly series, purchases, brands, stores, children |
| GET | `/insights/review` | `needs_review` and `failed` lines, paginated |

## 4. Folder structure

`−` removed in step 1, `+` new in step 2, `~` changed.

```
packages/
  ai/src/ai/
    schemas.py                  ~ step 1: − Category; step 2: + Category literal (14), line/txn category
    client.py                   ~ step 1: − category rules; step 2: + new category rules
    items.py                    + classify_bill(): compact catalog prompt, strict schema
    settings.py                 ~ openrouter_item_model (defaults to openrouter_model)
  ai/tests/
    test_extract.py             ~
    test_items.py               +
  storage/src/storage/
    models/category.py          + Category StrEnum (source of truth for api/storage)
    models/catalog.py           + CatalogItem, CatalogAlias
    models/spend.py             ~ − category (step 1); + line facts, category, category_source, item_* (step 2)
    models/__init__.py          ~ exports
    crud/spend.py               ~ filters, enqueue on confirm, reset on edit
    crud/catalog.py             + keys, search, aliases, claim_pending, finalize, set_item, insights reads
    catalog/
      __init__.py               + load(): upsert by slug, retire missing
      __main__.py               + python -m storage.catalog load
      catalog.csv               + slug, parent_slug, name, synonyms, category, retired
      SOURCES.md                + source + license notes
  storage/tests/
    test_catalog.py             + loads twice cleanly; parents exist; categories valid; no duplicate keys

apps/
  worker/src/worker/
    main.py                     ~ documents first, then one item batch
    consumers/items/
      __init__.py               +
      consumer.py               + claim → handle → finalize (hash check)
      handler.py                + saved answers → model → gate
      gate.py                   + new-item check (pure)
    eval_items.py               + python -m worker.eval_items (real model, not CI)
    draft_catalog.py            + dev tool: model drafts items per family → CSV for review
    consumers/extraction/services/draft_mapper.py  ~ − category (step 1); + line facts, category (step 2)
  worker/tests/
    test_draft_mapper.py        ~
    test_items_handler.py       +
    test_items_gate.py          +
    test_category_parity.py     + ai Literal == storage enum
    fixtures/items_labeled.jsonl + ~300 lines, food + non-food, ≥5 stores, near-duplicate traps

  api/src/api/
    bootstrap.py                ~ include catalog + insights routers
    modules/spend/              ~ step 1 strip; step 2 category filter/mix, PUT /{id}/item
    modules/documents/services/confirm.py        ~ mark receipt lines pending
    modules/documents/services/add_line_item.py  ~ category required for manual; mark pending
    modules/catalog/            + router.py, schemas.py, service.py (search)
    modules/insights/           + router.py, schemas.py, service.py, analytics.py (pure), presenter.py
  api/alembic/versions/
    <rev>_drop_spend_category.py   + step 1
    <rev>_categories_and_items.py  + step 2
  api/tests/modules/
    spend/test_spend.py         ~
    documents/test_documents.py ~
    catalog/test_catalog.py     +
    insights/test_insights.py   + purchase counting, family rule, weekly zeros, currency split

  web/src/
    lib/categories.ts                    + 14 labels + tint tokens
    app/index.css                        ~ − old tints; + 14 tints
    api/spend-items/*                    ~
    api/documents/documents.types.ts     ~
    api/catalog/catalog.ts, .types.ts    +
    api/insights/insights.ts, .types.ts  +
    hooks/spend-items/use-spend-filters.ts  ~
    hooks/catalog/use-catalog.ts, query-keys.ts     +
    hooks/insights/use-insights.ts, query-keys.ts   +
    components/spending/CategoryBadge.tsx  − step 1, + step 2 (new list)
    components/spending/*                  ~ filter, summary mix, add-line category, review
    components/insights/
      RecurringItemsList.tsx      + family rows expand
      ItemDetailSheet.tsx         + ui/sheet
      WeeklyPurchasesChart.tsx    + plain SVG bars
      ReviewList.tsx              +
      ItemPicker.tsx              + uses shadcn command
    components/ui/command.tsx     + shadcn add command
    pages/overview/OverviewPage.tsx  ~ recurring list + review entry

docs/
  architecture/decisions.md   ~ replace the two category rows; add rows in §5
  architecture/overview.md    ~ worker runs two jobs; catalog load step
  product/scope.md            ~ new endpoints
  design/spending.md, global.md ~ 14 categories, tints
  design/overview.md          + when UI ships
```

## 5. Decisions to record

| Chosen | Rejected | Why |
|---|---|---|
| 14 fixed visible categories in code; items hidden | Separate product groups; category tree in DB | One visible system; whole bills still get a category |
| Item sets the line's category unless the user set it | Keep the extraction category | Fixes detergent-on-grocery-receipt without overriding the user |
| Catalog CSV in git → loaded into Postgres; runtime reads DB | Reading the CSV at runtime; Alembic data migrations | Reviewable diffs; FKs, per-user rows, and SQL joins need a table |
| Starter catalog (~1,000 items) + private learned items; manual promotion | Blank slate; importing outside catalogs; auto-sharing | No cold start; privacy; license safety |
| One model call per bill with the compact catalog | Two-step family → item; embeddings | Fits in one prompt at ~1,000 items. Revisit if the catalog passes ~2,500 items |
| Classify on confirm / add line / description edit | On extraction | Drafts are rewritten or abandoned |
| Item fields on `spend_items`; SKIP LOCKED queue in the same worker | Separate tracking table; new queue | No new delete ordering; mirrors documents |
| New item auto-created under an existing family; new family → review; code near-duplicate check | Always ask; always auto | Low friction without drift |
| Reset dev data | Migrating old categories | Old values don't map onto the 14; data is disposable |

## 6. Build order (one branch)

| # | Build | Done when |
|---|---|---|
| 1 | ~~**Strip categories** (§2)~~ Done in #24 | No category code left; tests green; web builds |
| 2 | Catalog data: download references (with OK), `draft_catalog.py`, review, `catalog.csv`, `SOURCES.md`, labeled lines | CSV committed; ≥ 75% starter coverage on labeled lines |
| 3 | Categories back in: enum + parity test, extraction schema/prompt, `draft_mapper`, migration, spend filter/mix/badges | Uploaded bills show the 14 categories |
| 4 | Catalog tables, loader, line facts, item columns, confirm/add-line/edit hooks | Confirmed lines become `pending`; loader re-runs cleanly |
| 5 | `ai/items.py`, worker consumer + gate, retries, eval | Item ≥ 90%, needs review ≤ 10%, new items ≤ 3% of lines, zero near-duplicates on trap lines, non-products never counted |
| 6 | `/catalog`, `/insights`, `PUT /spend-items/{id}/item` | One correction fixes all same-text lines; counting rules tested |
| 7 | Web: Overview recurring list, detail sheet, review list, picker | Walk-through on real receipts |
| 8 | Load catalog, upload real receipts, fix misses in the CSV, re-run eval (dev DB already reset in step 1) | Targets hold on real data → merge |

Step 2 is data work and can run alongside steps 3–4.

## 7. Out of scope for v1

Items on statement rows or loose manual entries, merchant rules (Uber → Transport), duplicate-upload detection, merging items, per-user rename or hide of starter items, unit-price trends, due-soon alerts, user-defined categories.
