# Spending

The Spending route is the confirmed ledger and the entry point for document
extraction. It inherits the signed-in Operate-mode shell and the global
monochrome visual system.

## Flow

1. `Add Document` appears in the route's top bar.
2. The action opens a shadcn Dialog with one upload target. The browser file
   picker and drag-and-drop accept PDF, HEIC/HEIF, PNG, JPG, GIF, or WebP up to
   15 MB. There is no camera or scan action.
3. `POST /documents` starts extraction. The same Dialog polls
   `GET /documents/{id}` and shows processing, failure, and ready states.
4. A ready receipt with a total draft can be saved as one total or itemized
   rows. Statements are itemized. All extracted rows start selected; flagged
   lines remain called out in the item Accordion. Duplicate hashes and
   mismatched totals produce review warnings.
5. `POST /documents/{id}/confirm` adds selected drafts to Spending and refreshes
   the ledger.

Closing the Dialog during extraction does not discard its local progress;
reopening the top-bar action returns to the current document while the shell
remains mounted.

## Ledger

Confirmed `GET /spend-items` rows are grouped by source document. Manual rows
remain individual entries. Each group is a shadcn Accordion item. The trigger
is one row: merchant title, then outline pill Badges for date, source
(`Document` or `Manual entry`), and item count (`1 item` / `N items`). The
group total stays on the right. Expanding a group reveals numbered products
nested under the bill: indented to the merchant text column, quieter type,
optional categories, and amounts. Line items sort by `line_index`, then spend
date. Groups are ordered newest first by the first entry's spend date.

The ledger fills the dashboard content panel below `2xl`; at `2xl` it uses a
wide centered maximum for readability. The page itself does not scroll; the
bill list below the Transactions heading is the only overflow region, so an
open bill does not clip mid-row or leave an empty strip after the last product.
Accordion triggers intentionally omit disclosure icons, use a pointer cursor,
and reveal a muted hover state while closed. The accordion is a 1px card box
with `rounded-xl` corners; inner rows stay square. One hairline divides bills
(`AccordionItem` `not-last:border-b`). An expanded bill draws one `border-t`
on the panel under the title. Products use `not-first:border-t` so the last
product does not stack a second rule on the bill divider. The open panel hugs
its rows (`h-auto`).

The surface stays flat and monochrome: semantic neutral backgrounds and muted
fills establish hierarchy. Geist, compact type, and tabular numerals keep the
dense financial content scannable; depth does not rely on shadows.

Loading uses an accordion-shaped Skeleton: a bordered `rounded-xl` stack of
bill rows (icon tile, merchant bar, badge chips, trailing amount). Failure
uses Alert. An empty ledger uses the Empty primitive, points at the top-bar
action, and includes an EmptyContent button that opens the same Add Document
dialog. Long extraction reviews also use a ScrollArea so the Dialog header
and confirmation action stay reachable.

## Structure

```text
src/pages/spending/SpendingPage.tsx
src/components/spending/
  AddDocumentDialog.tsx
  DocumentReview.tsx
  SpendingAccordion.tsx
  SpendingLedgerSkeleton.tsx
  spending-formatters.ts
```
