# Spending

The Spending route is the confirmed ledger and the entry point for document
extraction and manual bills. It inherits the signed-in Operate-mode shell and
the global monochrome visual system.

## Flow

1. `Add spending` appears in the route's top bar.
2. The action opens a shadcn Dialog with two choices: upload a file, or add
   manually. All three steps use the global dialog width. Upload and Add
   manually include Back next to the primary action.
3. Upload takes several files at once. The browser file picker and
   drag-and-drop accept PDF, HEIC/HEIF, PNG, JPG, GIF, or WebP up to 15 MB,
   up to 5 minus whatever is already uploading or extracting; rejected files
   are listed with their reason. There is no camera or scan action. **Upload
   and extract** hands the files to the app-level upload queue, toasts, and
   closes the Dialog. From there, progress and review live in the
   [notification center](./notifications.md).
4. Review opens from a notification. A ready document shows every extracted spend item as a numbered flat
   list, each with its text exactly as printed on the bill. Double-click a name or amount to edit it inline; the extracted
   category uses the same tinted badge picker as the ledger. Flagged lines
   show a warning icon with a tooltip. Duplicate hashes appear as a tooltip on the
   merchant title. Mismatched totals still produce a review warning. The list caps
   at `max-h-72` and scrolls so the header and footer stay reachable. The
   summary is two aligned rows: merchant and total, then the date picker
   (`sm`), the file (icon and name) and the item count. The footer keeps
   **Discard** and **Save** together at the bottom right: Discard asks once in
   place, then deletes the bill and its drafts; Save confirms them (below).
5. `POST /documents/{id}/confirm` adds all reviewed drafts to Spending and
   refreshes the ledger. The date filter never changes on its own: if the
   bill's date falls outside it, a sonner toast ("Saved <merchant>", the date,
   "outside your date filter") offers a Show action that clears the date
   filter. There is no total-versus-itemized choice or partial
   selection. Before confirming, a receipt's date is a shadcn date picker
   (outline button + Calendar popover with month/year dropdowns);
   a "Check the date" alert appears when it is more than a year ago or in the
   future, and a changed date is saved on every line.
6. Add manually asks only for a bill name. `POST /documents/manual` creates a
   fileless ready document. The bill appears in the ledger immediately, even
   with zero lines, and opens so the add-row is visible.

Uploads belong to the shell, not the Dialog: closing it or changing page
never stops an upload or an extraction.

## Filters

Filter state is the URL. `useSpendFilters()` reads the Bills / Items view from
the route and reads the remaining filters from search params; there is no
React context. Bare `/spending` preserves its query string and redirects to
`/spending/bills`. Defaults are not written on first paint. Legacy
`/spending?view=items` links redirect to `/spending/items`.

| Param        | Default when omitted                                         |
| ------------ | ------------------------------------------------------------ |
| `date`       | all time (`this-month` / `last-month` / `last-3-months` / `this-year` / `custom`) |
| `from`, `to` | only with `date=custom`, ISO dates                           |
| `category`   | none (repeatable, one of the 14 categories)                  |
| `source`     | none (`manual` or `document`)                                |
| `q`          | none                                                         |
| `page`       | `1` (1-based; written only when greater than 1)              |

Presets resolve to dates at read time, so `this-month` stays current. Old
`period` links are ignored and dropped on the next write.

The toolbar is one row: a Filters button, a secondary count Badge
(`24 bills` / `128 items`), and search pushed to the right. Filters opens a
DropdownMenu with three submenus — Date, Category, Source — each showing its
current value on the right. Submenus open on hover, click, or arrow keys.
Date is a radio list of All time and the presets, then Custom range…, which
closes the menu and opens a dual-month range popover anchored to the Filters
button; the first date starts a fresh range, the second completes it, and
draft dates stay local until Apply. Category is a checkbox list with
swatches; Source is a radio list. Choices apply at once and keep the menu
open. Clear filters (date, category, source) appears when any is set, and the
button shows that count. Search is local, writes `q` after 300ms, and has
its own clear button. Below `md`, Filters opens a bottom sheet with the same
three groups as toggle chips. There is no chip row.
`GET /spend-items` and `GET /spend-items/summary` share the same query;
summary also receives `period` (`month` for this / last month, `custom`
for other ranges, omitted for all time). The list is a `{data, total}` page.
Items view sends `skip`/`limit` of 50 and shows a numbered pager footer
(`Showing X–Y of N`) when `total` exceeds 50. Changing any filter resets
`page`. Bills view requests `limit=200` and is not paged — grouping and
bill totals are computed client-side from the returned rows.

Bills and Items render only the filter toolbar above the ledger; charts
live on `/spending/analytics` (see Analytics below). The summary payload remains an
internal source for first-use detection, filtered-empty detection, and the
bill count. First-use (`has_spend === false`) fades the toolbar. A filtered
empty result (`has_spend` and `total === "0.00"`) shows a Reset empty
state that clears filters and search.

## Ledger

Confirmed `GET /spend-items` rows are grouped by source document. Fileless
manual bills use the same `document_id` grouping; leftover ungrouped
`POST /spend-items` rows remain individual entries. Empty manual documents
from `GET /documents` (`source=manual` with no spend items) render as bills
with a zero total when no category, source, or search filter is set and
`created_at` falls in the date filter. They stay hidden in Items view.
Each group is a shadcn Accordion item. The trigger is one
row: merchant title, then outline pill Badges for date, source (`Document` or
`Manual entry` from spend `source`, or the empty manual document), item
count (`1 item` / `N items`), and a read-only category badge per distinct
line category. The merchant tile is a pencil for manual bills and a document
icon otherwise. The group total stays on the right, followed by
an accent three-dot tile that matches the merchant icon. That control does not
toggle the accordion. It opens a dropdown: Edit expands the bill; Delete opens
a confirmation Dialog and, on confirm, removes the whole bill. Uploaded
document groups call `DELETE /documents/{id}` and remove the source file with
every line. Manual document groups call the same delete and skip blob cleanup.
Legacy ungrouped manual rows call `DELETE /spend-items/{id}`. Expanding a
group reveals its products on a `bg-muted/40` panel so they read as part of
that bill. Each line is a four-column grid that mirrors the bill row: a
1-based line number centered under the merchant tile, the item name with its
category badge aligned to the merchant text, the amount aligned to the bill
total, and an action column under the three-dot tile (the delete icon while
editing). The name truncates; the badge stays `w-fit` and does not wrap
underneath. Bill rows use `py-3` (`sm:py-3.5`).

Analytics, Bills, and Items navigation lives in the Spending sidebar group
and the header breadcrumb dropdown; the page has no heading above the ledger. Items is a read-only table: #, Date, Item,
Product, Merchant, Category, Source, Amount. `#` continues across pages
(page 2 starts at 51). The table hugs its rows, caps at the space left in the
panel, scrolls inside, and keeps its header sticky. Row edit is later.
Clicking a line's badge opens a DropdownMenu of the 14 categories with
swatches; the current value is checked, and choosing one saves through
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
it reveals name, category, and amount fields that save through
`POST /documents/{id}/line-items`. Statements, total-only receipts, and
ungrouped manual rows omit the add-row.
Line items sort by `line_index`, then spend date. Groups are ordered newest
first by the first entry's spend date, or the document `created_at` when the
bill is still empty.

Matched receipt lines also show an item badge after the category badge: a
neutral outline with the catalog item's name (family on hover), "Matching…"
while pending, "Not a product", or a dashed "Pick item" when the line needs
review. Clicking it opens a Popover picker: a search over `/catalog/search`
(name · family), "Not a product", and "Create “…”" which then asks for the
family of the new private item. Saving calls `PUT /spend-items/{id}/item`;
the category follows the item unless the user set it, and the bill text
never changes. The Items table adds a Product column with the same badge.

The ledger fills the dashboard content panel below `2xl`; at `2xl` it uses a
wide centered maximum for readability. The page itself does not scroll. Many
bills scroll the list under the toolbar. The accordion card hugs its rows.
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
the ledger: soft fills with matching ink, label always present. Geist,
compact type, and tabular numerals keep the dense financial content
scannable; depth does not rely on shadows.

Loading keeps the toolbar live and uses an accordion-shaped Skeleton: a
bordered `rounded-xl` stack of
bill rows (icon tile, merchant bar, badge chips, trailing amount, kebab
tile). Failure of the list uses Alert; a summary failure still shows the
ledger. First-use uses a compact dashed Empty frame
centered under the toolbar, hugging its copy, pointing at the
top-bar action, and including an EmptyContent button that opens the same Add
spending dialog. A filtered empty result uses the same Empty frame with
Reset. Long extraction reviews cap the numbered item list at
`max-h-72` so the Dialog header and confirmation action stay reachable.

## Analytics

`/spending/analytics` uses the same `SpendingToolbar` and URL filters as
Bills and Items (the badge counts bills), so switching tabs keeps the
filters. It hides search and ignores any `q` carried in the URL. One `GET /spend-items/analytics` call takes the list query and
returns every chart's numbers; it is aggregated in Python over the filtered
rows, like the summary.

| Block | Shows |
| --- | --- |
| Stat cards | Total spent (with change vs the previous period), Bills (items below), Average bill (daily average below), Top category (share and amount) |
| Spending over time | Area chart in `--chart-1` with a fading fill. Buckets are daily up to 31 days, weekly up to 183, then monthly; empty buckets are zero |
| By category | Donut in category ink colors with the total in the middle, then a ranked list. Clicking a row or slice toggles that category filter |
| Top merchants, Largest bills | Top 5 rows with a bar scaled to the first row. Clicking opens Bills searched by that merchant, keeping the other filters |
| By weekday | Monday–Sunday bars; the busiest day is solid, others faded |

Amounts are never summed across currencies. The response covers one
currency (`?currency=`, default the most used in the range) and lists every
currency present; with more than one, an "Amounts in" toggle above the stat
cards switches it (written to the URL). The covered span is the date filter,
or first spend through today for All time. Nothing after today counts: the
query, totals, comparison, and trend all stop at today unless the whole
range is in the future. The comparison only appears for a bounded date
filter: whole calendar months step back by months and cut to the same
elapsed days (this month to date vs the same days last month); any other
range steps back by its own length. With nothing spent in the previous
period, the footnote says so instead of a percentage. Up is
`text-destructive`, down is `text-chart-2`.

Layout: four stat cards (two columns below `lg`), then trend (3/5) beside
categories (2/5), then merchants, bills, and weekday (three columns at `xl`,
two at `md` with weekday full width). The panel scrolls under the toolbar.
Loading is a skeleton of the same grid; first-use and filtered-empty reuse
the Empty frame with Add spending or Reset.

## Structure

```text
src/pages/spending/SpendingPage.tsx
src/pages/spending/AnalyticsPage.tsx
src/components/spending-analytics/
  AnalyticsStats.tsx  TrendChart.tsx  CategoryBreakdown.tsx
  TopLists.tsx  WeekdayChart.tsx  analytics-format.ts
src/hooks/spend-items/use-spend-filters.ts
src/components/spending/
  AddSpendingDialog.tsx
  AddDocumentDialog.tsx      pick and hand off; no review inside
  CategoryBadge.tsx
  ItemBadge.tsx
  ItemPicker.tsx
  DocumentReview.tsx
  SpendingAccordion.tsx
  SpendingAddLineRow.tsx
  SpendingItemsTable.tsx
  SpendingItemsPager.tsx
  SpendingLedgerSkeleton.tsx
  SpendingSummary.tsx
  SpendingToolbar.tsx
  categories.ts
  spend-period.ts
  spending-formatters.ts
```
