# Dashboard and document intake

This document is the source of truth for the next signed-in web screens. Keep
the first implementation narrow: the app should accept document input and stop
there. Extraction, draft spend items, confirmation, and backend document
processing belong to later MRs.

## Goal

Authenticated users can reach a simple document intake page and provide one or
more files from a desktop or phone browser.

Supported input for this MR:

- Upload photos from the device.
- Upload PDFs from the device.
- On phones, open the camera flow to scan or photograph a document through the
  native browser file picker.

Out of scope for this MR:

- OCR, LLM extraction, worker jobs, and spend item drafts.
- Persisting document metadata beyond the minimum needed to prove intake.
- Manual spend entry, analytics, Plaid, WhatsApp, and agent flows.
- Building a custom camera/scanner UI. Use native mobile browser capture first.

## Routes

| Path             | Page            | Notes                                                          |
| ---------------- | --------------- | -------------------------------------------------------------- |
| `/`              | Document intake | Signed-in upload-first home screen.                            |
| `/documents/new` | Document intake | Alias for the same screen until more dashboard features exist. |

Guests still redirect to `/login`. Signed-in users keep access through
`GET /users/me`.

## Desktop home

The desktop layout should stay straightforward for this MR. Do not introduce a
full dashboard shell yet. Keep the shared ice-blue primary, Geist typography,
restrained surfaces, and spacing rhythm without
copying the auth screen composition or artwork.

Initial desktop content:

- Small user block with avatar initials and name or email.
- Centered or comfortably constrained upload area.
- Primary action: `Upload document`.
- Selected-file preview once a file is chosen.
- Optional logout control placed quietly away from the main action.

Do not build a marketing-style landing page after login. The first screen is
the product surface for uploading documents.

Background:

- Use one flat, cool-tinted `document-canvas` color in each theme. Do not divide
  the viewport into light and dark regions.
- Do not reuse the auth gradient or animated waveform field on signed-in pages.
- Keep motion functional: page arrival, drag feedback, file-list changes, and
  confirmation. Respect reduced motion.
- Avoid decorative clutter, loud financial imagery, or busy analytics visuals
  before the product has real data.
- The screen should feel stable and trustworthy; this is a money app, so visual
  calm matters more than density.

## Mobile home

The mobile home should be intentionally sparse until the product has more real
data.

Content:

- Avatar initials.
- User name when available; otherwise email.
- One primary button: `Upload or scan`.
- Optional small logout control.

Avoid desktop dashboard density on phones for this MR. The phone path should get
the user to document input quickly.

## Document intake page

Purpose: collect file input, show selected files, and let the user submit or
replace them.

Content:

- Page title: `Upload documents`.
- Supporting copy: `Add receipt photos or PDF statements.` Keep this short
  enough to avoid an orphaned final word on phone widths.
- One large input area backed by a native file input.
- Primary command: `Choose files`.
- Mobile command label can read `Upload or scan` while using the same input.
- Accept `image/*` and `application/pdf`.
- Allow multiple files.
- On mobile, include `capture="environment"` only for the camera-specific input
  if the UI offers a separate scan button. Otherwise rely on the normal file
  picker to avoid hiding PDFs.
- Selected-file list with filename, type, and size.
- Remove-file control per selected file.
- Submit button disabled until at least one file is selected.

Submission behavior for this MR:

- If the backend endpoint is not ready, keep submission local and show a clear
  in-app pending state such as `Ready to upload`.
- If `POST /documents` exists in this MR, send `multipart/form-data` through
  TanStack Query and show success/failure state.

## Implemented state

The initial frontend intake is implemented locally. It supports drag and drop on
desktop, the normal device picker on every viewport, a separate native rear
camera input on mobile, multiple-file selection, validation, removal, and an
animated ready state. No document bytes leave the browser yet.

## Implementation notes

- Frontend code stays in `apps/web`.
- API functions follow `src/api/documents/documents.ts` and
  `documents.types.ts`.
- Hooks go under `src/hooks/documents/`.
- Reuse shadcn primitives and Lucide icons.
- Keep routing simple in `App.tsx` until a dedicated route layout is needed.
- Use semantic Tailwind classes and existing CSS variables only.

## Later MRs

1. Add `POST /documents` storage with S3/MinIO and a `documents` table.
2. Add document list/status states: `uploaded`, `processing`, `ready`, `failed`.
3. Add worker extraction and draft `SpendItem` candidates.
4. Add review and confirm screens for extracted spend items.
