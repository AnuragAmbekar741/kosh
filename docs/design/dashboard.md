# Signed-in dashboard

This document is the source of truth for signed-in web chrome. Authenticated
users land in a collapsible sidebar shell with the ledger on the right. Tokens
stay those in [global.md](./global.md). Do not reuse the authentication
gradient or waveform on signed-in surfaces.

## Experience

The signed-in product is Operate-mode: scan, move, come back. Brand lives in
precise details — monochrome primary, Geist, flat 1px hairlines — not in
marketing chrome.

Overview is an empty destination until analytics exist: the `card` Empty
state from [global.md](./global.md#empty-states), centered in the panel, with a single CTA
to Spending. Spending contains the document intake,
extraction review, and confirmed ledger described in [spending.md](./spending.md).

Every signed-in page also carries the assistant: a launcher bottom-right that
opens a floating chat panel (see [agent.md](./agent.md)). Toasts sit
bottom-center so they never cover it.

While `useGetMe` is pending, the shell renders `DashboardSkeleton` — the same
inset Sidebar chrome with Skeleton placeholders — so the first paint matches
the loaded layout. The status is announced as “Opening your workspace.”

## Navigation

| Path                  | Page      | Notes                                                                         |
| --------------------- | --------- | ----------------------------------------------------------------------------- |
| `/`                   | Redirect  | Signed-in users go to `/overview` (phones: `/chat`). Guests go to `/login`. |
| `/chat`               | Chat      | Phones only: the assistant full screen. Desktop redirects to `/overview` with the panel open. |
| `/overview`           | Overview  | Empty destination. CTA to Spending. Future totals and breakdowns.             |
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

### Phone chat (`/chat`)

The assistant fills the space under the header, edge to edge, sharing the desktop panel's state (same open chat, history, and reply
in flight). The header reads "Kosh", with **Past chats** (↔ **Back to chat**)
and **New chat** before the bell. There is no floating launcher or panel on
phones.

Behind it, `ChatBackdrop` gives the page depth: the slate mist
(`--empty-wash`), the login page's waveform (`ContourField`) drifting slowly
and masked to fade at every edge, and a faint glow in the middle. It is
decorative and never takes taps. The cards, chips and composer above it are
frosted glass (`glass`: translucent card, blur, hairline, soft shadow), in
both themes. See [global.md](./global.md#glass-and-depth-phones).

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

All of that motion, and the waveform drift, stops under
`prefers-reduced-motion`.

The composer is a frosted pill (at least 48px tall) with the text box, a
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

The thread shows each send after the conversation's messages: page
thumbnails on the right (72×96, `object-cover`; a file tile for PDFs), then
one status line per page that follows the document:

| State | Line |
|---|---|
| Queued or sending | "Uploading {file}…" (shimmer) |
| Upload failed | The upload error with **Retry** |
| `uploaded` / `processing` | "Reading your bill…" (shimmer) |
| `failed` | "Couldn’t read {file}." plus the worker's error |
| `ready`, needs review | "{merchant} is ready to review" with **Review** (opens the full-screen review) |
| `ready`, reviewed | "Saved {merchant}" |
| Deleted | "Discarded {file}" |

Scans live for the session (`useChatScans` in `AppShell`); after a reload
the bell still has every document. One photo is one bill for now; combining
pages into one bill, and handing the result to the assistant as a confirm
card, come with agent phase 2.

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
