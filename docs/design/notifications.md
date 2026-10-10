# Notification center

A bell in the header, on every signed-in page, tracks each uploaded document
from upload to review. It is a view of `GET /documents?inbox=true` plus files
the browser is still sending; there is no notifications table
([decisions.md](../architecture/decisions.md)).

## Flow

1. Add spending → Upload a file → pick up to 5 → **Upload and extract**. The
   Dialog closes at once and a toast says "Uploading 3 documents".
2. The upload queue (owned by `AppShell`) sends files one at a time with a
   per-file `Idempotency-Key`. Once the API answers 202, the file leaves the
   queue and the inbox shows it.
3. The worker extracts. The bell shows progress; when a document is ready, a
   toast "walmart.jpg is ready to review" offers **Review**.
4. **Review** opens the existing `DocumentReview` in its own Dialog. Its
   footer keeps both actions together at the bottom right, **Discard**
   (outline) then **Save** (primary); there is no Back, since closing the
   dialog already returns. **Save** confirms every
   line and toasts "Saved {merchant}" (with the out-of-filter **Show** action on
   Spending). **Discard** asks once in the footer ("Discard this bill?" ·
   Keep reviewing · Discard; on phones the question sits above its buttons), deletes the document, its
   drafts and file (`DELETE /documents/{id}`), and toasts "Discarded
   {merchant}". Either way the row leaves the bell.

## Bell

Rows tint on hover and keyboard focus with `foreground/6` (a clear lift on the
dark popover, a soft grey on light), and their icon well switches to the canvas
colour for contrast. Actions in a row are `xs` controls so they never outweigh
the row's text. The header shows "{n} need(s) you" next to the title.

- Ghost `icon` Button with an `aria-label` such as "Notifications, 2 need you,
  uploads in progress".
- Badge (`--primary`, tabular figures) counts what needs the user: ready to
  review, failed extraction, failed upload. It clears when they act; there is
  no read state.
- With nothing needing the user but something in progress, a small static
  Spinner sits in the badge's place.

## Panel

Popover, `align="end"`, `w-[calc(100vw-2rem)] sm:w-96`, a header, then a list
that scrolls inside `max-h-[min(28rem,70svh)]`. Two groups, each with a muted
label: **Needs you** first, then **In progress**. Browser uploads come first,
then the inbox newest first. Empty: the `plain` Empty state (no frame inside the popover), a check
tile, "You’re all caught up · Bills you upload show up here while they’re
read, and again when they need your review."

Rows are fixed height: an icon well (`bg-accent`, `size-9`; file or PDF
glyph, or a destructive alert glyph on failure), the filename (truncated, full
name in `title`), a muted status line, and the action.

| Stage | Source | Status line | Action |
|---|---|---|---|
| Waiting to upload / Uploading | browser queue | Spinner + text | none |
| Upload failed | browser queue (413, 415, 429, network) | destructive reason | Retry (same key), Remove |
| Waiting to extract | `uploaded` | clock + text | none |
| Extracting | `processing` | Spinner + text | none |
| Ready to review | `ready` and `needs_review` | text | The whole row opens the review. Discard (`icon-xs` ghost trash with a tooltip, shown on hover or focus, always on touch) and **Review** (`xs`, secondary). Discard asks in the row: it tints `destructive/5`, the status reads "Discard this bill?", actions become Cancel · Discard (`xs`) |
| Couldn’t read this document | `failed` | destructive text | Remove (`xs`, secondary; deletes the document) |

## Polling

`useDocumentInbox` fetches on load, on returning to the tab, and after any
upload, confirm, or delete. It polls only while some document is `uploaded` or
`processing`: every 3 s, slowing to 15 s once the oldest has run for 2
minutes. With nothing in flight it makes no background calls, and hidden tabs
never poll. A tab warns before closing only while bytes are still being sent.

## Structure

```text
src/hooks/documents/
  use-documents.ts       useDocumentInbox (polling rule), useUploadDocument
  use-uploads.ts         upload queue: useUploadsState, UploadsContext, useUploads
  use-ready-toasts.ts    toast when a document turns ready or failed
src/components/notifications/
  NotificationCenter.tsx   bell, badge, Popover, review state
  NotificationList.tsx     groups, actions, empty state
  NotificationRow.tsx      one row
  notification-items.ts    document or upload → row (stage, label, group)
  ReviewDocumentDialog.tsx existing DocumentReview in a Dialog
```
