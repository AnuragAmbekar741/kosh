# Signed-in dashboard

This document is the source of truth for signed-in web chrome. Authenticated
users land in a collapsible sidebar shell with the ledger on the right. Tokens
stay those in [global.md](./global.md). Do not reuse the authentication
gradient or waveform on signed-in surfaces.

## Experience

The signed-in product is Operate-mode: scan, move, come back. Brand lives in
precise details — monochrome primary, Geist, flat 1px hairlines — not in
marketing chrome.

Overview is a starter banner until analytics exist (see [Overview](#overview)).
Spending contains the document intake,
extraction review, and confirmed ledger described in [spending.md](./spending.md).

Every signed-in page also carries the assistant: a launcher bottom-right that
opens a floating chat panel (see [agent.md](./agent.md)). Toasts sit
bottom-center so they never cover it.

While `useGetMe` is pending, the shell renders `DashboardSkeleton` — the same
inset Sidebar chrome with Skeleton placeholders — so the first paint matches
the loaded layout. The status is announced as “Opening your workspace.”

## Overview

On desktop (≥768px) `/overview` is `OverviewStarter`
(`src/components/overview/`): a full-panel banner that says what Kosh is and
shows how line-by-line bills reveal habits. It fills the inset panel edge to
edge with no card around it, and always shows until real Overview totals
exist. Phones keep the `card` Empty state (they land on Chat anyway). Copy and
sample rows live in `overview-copy.ts`.

- **Backdrop:** `--empty-wash` (Slate mist) plus `ContourRings`
  (`src/components/visuals/`): 16 faint closed rings in the top-right in
  `--auth-line-mid`, masked to a radial fade, drifting on a 26s loop like
  `ContourField`. This is not the auth waveform.
- **Hero, left:** `EngravedWordmark`, an SVG "Kosh" in Geist 640 whose glyphs
  are filled with 64 contour rings (0.55px, `--foreground`) under a 1px outline
  at 55%. On mount the outline draws in (1.6s), the rings fade in from the
  center out, then the meaning line rises in. After that the rings "breathe": a
  slow phase drift at 30fps via `useAnimationFrame`, writing `d` through refs.
  Under it: `/kōsh/ a treasury. Yours is in the details.`, the lede, and two
  `lg` actions: **Add your first bill** (`openAddSpending("upload")`) and
  **Ask the assistant** (opens the assistant panel).
- **Hero, right:** `SampleLedger`, a `glass` panel of six static example lines
  (dashed **Example** tag, existing `CategoryBadge`), which write in once and
  again from its Replay button, then the late-night pattern card.
- **Steps:** three `StarterSteps` link cards (Upload a bill, Bills, Analytics).
  Hover changes only the border (`--ring` at 40%) and nudges the arrow; no
  lift or shadow.
- **Layout:** two hero columns over the step row. Below a 900px container
  width (a container query, since the sidebar collapses) everything stacks
  into one column and the banner scrolls.
- **Reduced motion:** no drift, entrance, Breathe or write-in; the final state
  shows at once.

## Navigation

| Path                  | Page      | Notes                                                                         |
| --------------------- | --------- | ----------------------------------------------------------------------------- |
| `/`                   | Redirect  | Signed-in users go to `/overview` (phones: `/chat`). Guests go to `/login`. |
| `/chat`               | Chat      | Phones only: the assistant full screen. Desktop redirects to `/overview` with the panel open. |
| `/overview`           | Overview  | Starter banner (desktop). Future totals and breakdowns.                       |
| `/spending`           | Redirect  | Preserves search params and opens Bills.                                      |
| `/spending/analytics` | Analytics | Charts over the filtered ledger. See [spending.md](./spending.md#analytics). |
| `/spending/bills`     | Bills     | Existing grouped bill ledger.                                                 |
| `/spending/items`     | Items     | Existing item table and pager.                                                |

Primary destinations live in
[`src/components/layout/navigation/navigation.ts`](../../apps/web/src/components/layout/navigation/navigation.ts).
The sidebar and the header both read from that list. For a parent with
children (Spending) the header is a breadcrumb: `Spending ›` then a ghost
`DropdownMenu` trigger naming the current child, which switches between
Analytics, Bills, and Items and keeps the URL filters.

The sidebar uses the shadcn `Sidebar` primitive (`variant="inset"`,
`collapsible="icon"`). Spending is a parent row with Analytics, Bills, and
Items beneath it as indented icon rows (no guide line); clicking the parent
expands or collapses that subtree with a 200ms height fade. The parent is
medium weight while one of its pages is open, and takes the active fill
itself when the subtree is collapsed.
Collapsing leaves a
3rem icon rail: hovering or activating the centered Spending icon
opens a keyboard-accessible `DropdownMenu` containing the same children.
Collapse state persists in the `sidebar_state` cookie and toggles with
`Cmd/Ctrl+B`. Below `768px` there is no sidebar; see [Phones](#phones).

The inset panel is locked to the viewport (`h-dvh`, inset margin subtracted
on `md+`). The header stays put; page content fills the remaining height
with `overflow-hidden`, so Overview and Spending do not scroll the page.

The account menu sits in the sidebar footer. Its trigger shows the initials
tile and the name (email when there is no name), centered on one line; the
open menu shows name, email, and Sign out.
Settings is out of this step.

### Phones

Below `768px` (`useIsMobile`), the sidebar and its trigger are gone. One
floating nav button (`PhoneNav`) replaces the old bottom tab bar:

- **Button:** 48px, `rounded-2xl`, `bg-primary`, `--glass-shadow-lg`, a grid
  icon that turns into an X while open. On Bills, Items and Insights it floats
  bottom-right, 16px from the edge and above `env(safe-area-inset-bottom)`. On
  Chat it sits at the left of the composer row, so the two never overlap. A
  small count badge shows bills waiting for review (the bell's inbox query),
  and the button's name reads "Menu, 2 bills to review".
- **Stack menu:** tapping the button blurs the page under a scrim (`--scrim`;
  a tap on it or Esc closes) and stacks frosted rows upward from the button,
  the nearest first, 30ms apart. Each row is a 44px `glass-strong` icon tile
  with a frosted label pill on the inner side (left of the tile when the
  button is on the right, right of it on Chat). The current page's tile is
  filled `bg-primary`.

| Row (top to bottom) | Does | Current when |
|---|---|---|
| Scan a bill (camera, 48px tile) | Opens the phone's camera (`capture="environment"`); the photo is sent from Chat, so it switches there | — |
| Chat | `/chat` | Chat is open |
| Bills | `/spending/bills` | Bills or Items is open |
| Insights | `/spending/analytics` | Analytics is open |
| You | A bottom sheet: initials, name, email, **Sign out**, and a Light / Dark / System theme switch | — |

The menu is a Base UI `Popover`: the button carries `aria-expanded` and
`aria-haspopup`, focus moves to the first row on open and back to the button
on close, rows are links with `aria-current="page"` (Scan and You are
buttons), and every row is at least 44px tall. With reduced motion the menu
appears without the rise or stagger.

There is no reserved bar at the bottom: scrolling lists pad by
`--phone-nav-clearance` (`5rem` plus the safe area) so the button never covers
a row. Sign out sits in the You sheet header, not at the bottom. Page padding
drops to 16px. Overview has no menu row, so phones land on Chat. The loading
skeleton drops the sidebar trigger and shows the nav button's shape.

### Installed app

Kosh is installable (`public/manifest.webmanifest`): name "Kosh", `standalone`,
start at `/` (phones land on Chat), portrait. The icon is the **K** from the
Overview's engraved wordmark: bold Geist (weight 640) filled with the same
contour rings, under its faint outline, near-white on the dark card colour.
Sizes: 192 and 512 px, a 512 px maskable one with a smaller K inside the safe
zone, and a 180 px Apple touch icon. The rings don't survive 16–32 px, so
`favicon.png` (64 px) is a solid K on a rounded tile. The icons are drawn from
the `EngravedWordmark` ring formula on a canvas with Geist loaded. `ThemeProvider` keeps
`<meta name="theme-color">` equal to the resolved `--background`, so the
installed app's status bar follows the app's Light / Dark / System choice.
iOS uses the `default` status bar style, so content never sits under it.

### Phone chat (`/chat`)

The assistant fills the space under the header, edge to edge, sharing the desktop panel's state (same open chat, history, and reply
in flight). The header reads "Kosh", with **Past chats** (↔ **Back to chat**)
and **New chat** before the bell. There is no floating launcher or panel on
phones.

Behind it, `ChatBackdrop` gives the page depth: the slate mist
(`--empty-wash`), the login page's waveform (`ContourField still`, which
doesn't drift here) masked to fade at every edge, and a faint, still glow in
the middle. It is decorative and never takes taps. The cards and chips above
it are frosted glass (`glass`: translucent card, blur, hairline, soft shadow),
in both themes. The backdrop stays still on purpose: glass over a moving layer
is re-blurred every frame, and that made typing lag on phones. See [global.md](./global.md#glass-and-depth-phones).

Before the first message the thread shows `AgentHome`:

- **Summary card** (`AgentSummaryCard`, glass, `rounded-2xl`), a link to
  Bills filtered to this month: "{Month} so far", the month total
  (`/spend-items/summary`, `period=month`), the bill count, and "· N to
  review" when extracted bills are waiting (same inbox query as the bell).
  Skeleton while loading.
- **Hero**, centred between the card and the chips: a 52px frosted icon tile
  (sparkles), the mono eyebrow "Your spending assistant", "Ask about your
  spending", and "Answers come from your confirmed bills. Nothing is changed
  from chat."
- **Suggestion chips**: the three example questions as full-width stacked
  glass rows with a small leading icon, just above the composer. They rise in
  one after another, then float a few pixels, slowly. A chip sends its
  question.

All of that motion stops under `prefers-reduced-motion`.

The composer is a pill (at least 48px tall) in the glass colours
(`--glass-strong`, hairline, soft shadow) but with **no backdrop blur**, since
it repaints on every keystroke. It holds the text box, a
paperclip, and a round send button; the nav button sits to its left. Past
chats has no composer, so the nav button floats bottom-right there.
The composer doesn't take focus on load, so the keyboard stays down until the
user taps it.

### Scanning bills (phones)

**Scan a bill** is the first row of the nav menu on every phone page:
it opens the phone's own camera (`capture="environment"`), and a photo taken
from Bills or Insights switches to Chat. In the composer, the paperclip
(**Add photos**) picks up to 5 images or PDFs.

A chosen file sends at once; there is no staging step. Images are shrunk in
the browser (`lib/shrink-image.ts`): long edge at most 2000px, JPEG at 0.85,
EXIF orientation applied. PDFs, small images, and anything the browser can't
decode (HEIC outside Safari) go up untouched. Each file uploads as its own
document through the same queue as the Add documents dialog
(`useUploads`, `POST /documents`), so the bell tracks it too.

Chat uploads use `source=agent`. While a scan uploads, the thread shows it
after the conversation: page thumbnails on the right (72×96, `object-cover`;
a file tile for PDFs) and one line per page: "Uploading {file}…" (shimmer), or
the upload error with **Retry**. Once every page has settled, the uploaded
ones are **sent as a chat message** with their `document_ids` and no text; a
page that succeeds later on Retry goes out on its own. The upload queue
reports each settled file to `useChatScans` (in `AppShell`, so it sends even
if the user left Chat), and `useSendMessage` queues a send while a reply is
still streaming, so a scan never interrupts one.

From there the thread is the agent's:

- **Your message** shows the bills (`AgentAttachments`): the photo while this
  session still has it, a frosted file tile after a reload. A photo sent on
  its own has no text bubble.
- **While the reply waits for extraction**, the status line reads "Reading
  your bill…" (from the `document` events), then the tool labels.
- **The bill card** (`AgentBillCard`, `glass-strong`, `rounded-2xl`) follows
  each `action` event and, after a reload, the reply's `actions`. Header:
  receipt icon tile, merchant, "{date} · {n} lines", total per currency. Body,
  while the bill waits for review: up to 4 draft lines (name and amount, from
  the live document), "+N more in Edit", and "Looks like a bill you've already
  saved" when the offer counted possible duplicates. Actions: **Save bill**
  (primary, `POST /documents/{id}/confirm`, toasts "Saved {merchant}"),
  **Edit** (the full-screen review dialog), and a ghost trash icon that asks
  "Discard this bill?" with **Keep** / **Discard** (`DELETE /documents/{id}`).
  The card follows the bill however it was decided: "Saved." with **View in
  Bills**, or "Discarded.".

One photo is one bill for now; combining pages into one bill comes later.

## Visual rules

- Sidebar canvas matches `--background`. The inset panel (and the mobile
  sheet) uses `--card` so it lifts off the page. A 1px hairline, never a drop
  shadow.
- The active nav item uses `bg-sidebar-accent` plus medium weight. Color is
  never the only signal. Do not fill the row with primary.
- Geist and the monochrome tokens from `global.md`. No pills, no glass, no
  decorative charts in the chrome.
- Motion is the 200ms sidebar width and subtree expand transitions only. Honor
  `prefers-reduced-motion`.

## Frontend structure

```
src/pages/overview/            OverviewPage
src/pages/spending/            SpendingPage
src/components/layout/            AppShell, AppSidebar, AppHeader, DashboardSkeleton
src/components/layout/navigation/ NavMain, NavUser, navigation.ts
src/components/brand/          FinanceMark (shared with auth)
src/components/ui/sidebar.tsx  shadcn Sidebar (Base UI)
```

Auth, API, and query hooks are unchanged. Feature UI belongs in
`src/components/<feature>/` when it exists — not in `layout/`.
