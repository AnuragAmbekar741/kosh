# Spending

The Spending route is the confirmed ledger and the entry point for document
extraction and manual bills. It inherits the signed-in Operate-mode shell and
the global monochrome visual system.

## Flow

1. `Add spending` appears in the route's top bar.
2. The action opens a shadcn Dialog with two choices: upload a file, or add
   manually. All three steps use the global dialog width. Upload and Add
   manually include Back next to the primary action.
3. Upload continues the existing document flow. The browser file picker and
   drag-and-drop accept PDF, HEIC/HEIF, PNG, JPG, GIF, or WebP up to 15 MB.
   There is no camera or scan action. `POST /documents` starts extraction. The
   same Dialog polls `GET /documents/{id}` and shows processing, failure, and
   ready states.
4. A ready document shows every extracted spend item as a numbered flat
   list. Double-click a name or amount to edit it inline; category uses the
   same tinted badge dropdown as the ledger. Flagged lines show a warning
   icon with a tooltip. Duplicate hashes appear as a tooltip on the merchant
   title. Mismatched totals still produce a review warning. The list caps
   at `max-h-72` and scrolls so the header and confirm action stay reachable.
5. `POST /documents/{id}/confirm` adds all reviewed drafts to Spending and
   refreshes the ledger. If the receipt date falls outside the current period
   filter, Spending jumps to that month so the new bill is visible. There is
   no total-versus-itemized choice or partial selection.
6. Add manually asks only for a bill name. `POST /documents/manual` creates a
   fileless ready document. The bill appears in the ledger immediately, even
   with zero lines, and opens so the add-row is visible.

Closing the Dialog during extraction does not discard its local progress;
reopening the top-bar action returns to the current document while the shell
remains mounted.

## Filters

Filter state is the URL. `useSpendFilters()` reads the Bills / Items view from
the route and reads the remaining filters from search params; there is no
React context. Bare `/spending` preserves its query string and redirects to
`/spending/bills`. Defaults are not written on first paint. Legacy
`/spending?view=items` links redirect to `/spending/items`.

| Param        | Default when omitted                            |
| ------------ | ----------------------------------------------- |
| `period`     | `month` (`day` / `week` / `month` / `custom`)   |
| `from`, `to` | current month, ISO dates                        |
| `category`   | none (repeatable)                               |
| `source`     | none (`manual` or `document`)                   |
| `q`          | none                                            |
| `page`       | `1` (1-based; written only when greater than 1) |

The toolbar is a connected Day / Week / Month toggle (`spacing={0}`). The
selected segment uses `bg-primary text-primary-foreground` so it reads on
both themes. Custom, prev/next, the period label, Category, All sources, and
search sit beside it. Custom opens a
dual-month range popover;
the first date starts a fresh range, the second date completes it, and draft
dates stay local until Apply. Search is local and writes `q` after
300ms. There is no chip row; filters live on the controls themselves.
Below `md`, Category / source / search collapse into one Filters sheet.
Whenever the state differs from the current calendar month, Reset clears all
filters and pagination and restores that whole month without changing the
Bills or Items route.
`GET /spend-items` and `GET /spend-items/summary` share the same query;
summary also receives `period`. The list is a `{data, total}` page.
Items view sends `skip`/`limit` of 50 and shows a numbered pager footer
(`Showing X–Y of N`) when `total` exceeds 50. Changing any filter resets
`page`. Bills view requests `limit=200` and is not paged — grouping and
bill totals are computed client-side from the returned rows.

Bills and Items render only the filter toolbar above Transactions; analytics
are reserved for `/spending/analytics`. The summary payload remains an
internal source for first-use detection, filtered-empty detection, and the
bill count. First-use (`has_spend === false`) fades the toolbar. A filtered
empty period (`has_spend` and `total === "0.00"`) shows a Reset empty
state.

## Ledger

Confirmed `GET /spend-items` rows are grouped by source document. Fileless
manual bills use the same `document_id` grouping; leftover ungrouped
`POST /spend-items` rows remain individual entries. Empty manual documents
from `GET /documents` (`source=manual` with no spend items) render as bills
with a zero total when no category, source, or search filter is set and
`created_at` falls in the visible range. They stay hidden in Items view.
Each group is a shadcn Accordion item. The trigger is one
row: merchant title, then outline pill Badges for date, source (`Document` or
`Manual entry` from spend `source`, or the empty manual document), item
count (`1 item` / `N items`), and a read-only category badge per unique
item category. The merchant tile is a pencil for manual bills and a document
icon otherwise. The group total stays on the right, followed by
an accent three-dot tile that matches the merchant icon. That control does not
toggle the accordion. It opens a dropdown: Edit expands the bill; Delete opens
a confirmation Dialog and, on confirm, removes the whole bill. Uploaded
document groups call `DELETE /documents/{id}` and remove the source file with
every line. Manual document groups call the same delete and skip blob cleanup.
Legacy ungrouped manual rows call `DELETE /spend-items/{id}`. Expanding a
group reveals products nested under the bill: indented to the
merchant text column, quieter type, a tinted category badge on the same row
as the item name, and amounts. Line-index numbers are omitted. The name
truncates; the badge stays `w-fit`
and does not wrap underneath.

Bills and Items navigation lives only in the Spending sidebar group; the
Transactions heading does not repeat that route switch. Items is a read-only table:
Date, Item, Merchant, Category, Source, Amount. Row edit is later.
Clicking the badge opens a DropdownMenu of the nine extraction categories
(Food, Transport, Housing, Entertainment, Shopping, Health, Utilities,
Travel, Other). The current value is checked. A row with no category shows
a muted Category trigger. Choosing a value saves through
`PATCH /spend-items/{id}`. Double-clicking an item name replaces it with an
auto-focused inline input at half the name column, with the category badge
beside it; the bill menu's Edit action opens the bill and
starts its first item for keyboard and touch discoverability. Enter or blur
saves the name through the same PATCH. Escape cancels. During item editing,
a destructive icon appears beside the amount. It opens a confirmation Dialog
and `DELETE /spend-items/{id}` removes only that item; the rest of the bill
and source file remain. Pending mutations disable their controls, and
validation or API failures stay beside the affected control.
Manual bills and itemized receipt bills end with an Add item row. Clicking
it reveals name, amount, and category fields that save through
`POST /documents/{id}/line-items`. Statements, total-only receipts, and
ungrouped manual rows omit the add-row.
Line items sort by `line_index`, then spend date. Groups are ordered newest
first by the first entry's spend date, or the document `created_at` when the
bill is still empty.

The ledger fills the dashboard content panel below `2xl`; at `2xl` it uses a
wide centered maximum for readability. The page itself does not scroll. Many
bills scroll the list under Transactions. The accordion card hugs its rows.
Every bill including the last has a `border-b` hairline. An expanded bill
draws one `border-t` on the panel under the title and animates to content
height. The open panel caps at `max-h-72` (about seven lines) and scrolls
after that. The items table keeps its own overflow.
Accordion triggers intentionally omit disclosure icons, use a pointer cursor,
and reveal a muted hover state while closed. The accordion is a 1px card box
with `rounded-xl` corners; inner rows stay square. Products use
`not-first:border-t` so the last product does not stack a second rule on the
bill divider.

The surface stays flat and monochrome: semantic neutral backgrounds and muted
fills establish hierarchy. Category badges are the only chromatic marks in
the ledger — soft fills with matching ink, label always present. Geist,
compact type, and tabular numerals keep the dense financial content
scannable; depth does not rely on shadows.

Loading keeps the toolbar live and uses an accordion-shaped Skeleton: a
bordered `rounded-xl` stack of
bill rows (icon tile, merchant bar, badge chips, trailing amount, kebab
tile). Failure of the list uses Alert; a summary failure still shows the
ledger. First-use uses a compact dashed Empty frame
centered under the Transactions heading, hugging its copy, pointing at the
top-bar action, and including an EmptyContent button that opens the same Add
spending dialog. A filtered empty period uses the same Empty frame with
Clear filters. Long extraction reviews cap the numbered item list at
`max-h-72` so the Dialog header and confirmation action stay reachable.

## Structure

```text
src/pages/spending/SpendingPage.tsx
src/hooks/spend-items/use-spend-filters.ts
src/components/spending/
  AddSpendingDialog.tsx
  AddDocumentDialog.tsx
  CategoryBadge.tsx
  DocumentReview.tsx
  SpendingAccordion.tsx
  SpendingAddLineRow.tsx
  SpendingItemsTable.tsx
  SpendingItemsPager.tsx
  SpendingLedgerSkeleton.tsx
  SpendingSummary.tsx
  SpendingToolbar.tsx
  spend-period.ts
  spending-formatters.ts
```
