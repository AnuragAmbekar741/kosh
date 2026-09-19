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
   lines remain called out in the item Accordion. Review shows a tinted
   category badge on the same row as each draft title, and names the category
   in the one-total copy. The ledger shows the same badge beside the item
   name when category is set. Duplicate hashes and mismatched totals produce
   review warnings.
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
group total stays on the right, followed by an accent three-dot tile that
matches the merchant icon. That control does not toggle the accordion. It
opens a dropdown: Edit expands the bill; Delete opens a confirmation Dialog
and, on confirm, removes the whole bill. Document groups call
`DELETE /documents/{id}` and remove the source file with every line. Manual
groups call `DELETE /spend-items/{id}`. Expanding a group reveals numbered
products nested under the bill: indented to the merchant text column, quieter
type, a tinted category badge on the same row as the item name, and amounts.
The name truncates; the badge stays `w-fit` and does not wrap underneath.
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
Line items sort by `line_index`, then spend date. Groups are ordered newest
first by the first entry's spend date.

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
fills establish hierarchy. Category badges are the only chromatic marks in
the ledger — soft fills with matching ink, label always present. Geist,
compact type, and tabular numerals keep the dense financial content
scannable; depth does not rely on shadows.

Loading uses an accordion-shaped Skeleton: a bordered `rounded-xl` stack of
bill rows (icon tile, merchant bar, badge chips, trailing amount, kebab
tile). Failure
uses Alert. An empty ledger uses a compact dashed Empty frame centered under
the Transactions heading, hugging its copy, pointing at the top-bar action,
and including an EmptyContent button that opens the same Add Document
dialog. Long extraction reviews also use a ScrollArea so the Dialog header
and confirmation action stay reachable.

## Structure

```text
src/pages/spending/SpendingPage.tsx
src/components/spending/
  AddDocumentDialog.tsx
  CategoryBadge.tsx
  DocumentReview.tsx
  SpendingAccordion.tsx
  SpendingLedgerSkeleton.tsx
  spending-formatters.ts
```
