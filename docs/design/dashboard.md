# Document intake and payments

This document is the source of truth for signed-in web screens. The product is
organized around a centered document workspace, not a dashboard shell.

## Experience

Authenticated users upload receipt images, HEIC photos, or PDF statements. The
app sends each file to `POST /documents`, polls document detail while extraction
runs, opens a review dialog when the result is ready, and confirms the user's
choice into the spend ledger. Confirmed entries appear in Payments grouped by
their source document.

The interface stays calm and focused during the long extraction call. A compact
status row shows an activity indicator, the current filename, and queued-file
count without a scanning metaphor, staged progress, or invented percentage.
Reduced-motion preferences are respected.

## Navigation

| Path | Page | Notes |
| --- | --- | --- |
| `/` | Document intake | Signed-in upload-first home screen. |
| `/documents/new` | Document intake | Alias for the upload screen. |
| `/payments` | Payments | Confirmed spend grouped by document. |

Guests redirect to `/login`. A compact, centered top switcher moves between
Upload and Payments. It takes the horizontal clarity of a simple application
header without adding a sidebar, dashboard grid, mobile drawer, search field, or
other admin-shell furniture. Account initials and logout remain quiet utilities.

## Document intake

- Desktop supports drag and drop plus the native file picker.
- Mobile provides both the normal picker and a rear-camera capture action.
- Multiple files can be submitted together and reviewed in sequence.
- Accepted input includes browser image types, `.heic`, `.heif`, and PDF.
- Upload failures and extraction failures remain in context with a recovery
  action.
- Active jobs poll every two seconds only while status is `uploaded` or
  `processing`.

## Review and confirmation

Ready documents open in a shadcn Dialog on the same screen. The dialog shows the
merchant or institution, document date, source filename, extracted total, and
individual items or transactions in a shadcn Accordion.

Receipts can be saved as one total or as selected line items. Statements are
always itemized. Low-confidence rows are flagged, duplicate-content matches are
disclosed, and an empty item selection cannot be confirmed. Closing the dialog
keeps a `Review extraction` action on the intake screen.

## Payments

Payments reads only confirmed `GET /spend-items` records. It groups entries by
`document_id`, joins source metadata from `GET /documents`, and orders groups by
document spend date. Each collapsed row shows the merchant, document date,
extraction date, and confirmed total. Expanding it reveals its saved line items,
categories, amounts, and source filename. Manual entries are grouped separately.

The page is one continuous ledger surface rather than a card grid. Empty,
loading, and error states are first-class.

## Visual rules

- Keep the flat cool `document-canvas`, Geist typography, ice-blue primary, and
  semantic color tokens defined in `global.md`.
- Do not reuse the authentication gradient or waveform on signed-in surfaces.
- Avoid dashboards, sidebars, KPI tiles, decorative charts, and nested cards.
- Keep content widths restrained: upload at `max-w-xl`, Payments at
  `max-w-3xl`, and the review dialog at `max-w-2xl`.
- Use motion for page arrival, upload feedback, the active navigation indicator,
  and a restrained extraction activity indicator only.

## Frontend structure

- API functions: `src/api/documents/` and `src/api/spend-items/`.
- TanStack Query hooks: `src/hooks/documents/` and
  `src/hooks/spend-items/`.
- Shared signed-in header: `src/components/layout/ApplicationShell.tsx`.
- Document flow components: `src/components/documents/`.
- Payments route: `src/pages/payments/PaymentsPage.tsx`.
- shadcn primitives provide Dialog, Accordion, Checkbox, and Button behavior.
