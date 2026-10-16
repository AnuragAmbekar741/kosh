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

Below `768px` (`useIsMobile`), the sidebar and its trigger are gone, and a
bottom tab bar (`PhoneTabBar`) sits under the page:

| Tab | Goes to | Active when |
|---|---|---|
| Chat | `/chat` | Chat is open |
| Bills | `/spending/bills` | Bills or Items is open |
| Insights | `/spending/analytics` | Analytics is open |
| You | A bottom sheet: initials, name, email, **Sign out**, and a Light / Dark / System theme switch | The sheet is open |

Tabs are 56px tall plus `env(safe-area-inset-bottom)` (`--phone-tab-bar`),
with a 20px icon over an 11px label. The active tab is `foreground` and the
rest are `muted-foreground`; only one is active at a time. Sign out sits in
the sheet header, not at the bottom, because a double tap on You lands at
the bottom of the sheet. Page padding drops to 16px. Overview has no tab, so
phones land on Chat. The loading skeleton drops the sidebar trigger and shows
the tab bar's shape.

### Phone chat (`/chat`)

The assistant fills the space between the header and the tab bar, edge to
edge, sharing the desktop panel's state (same open chat, history, and reply
in flight). The header reads "Kosh", with **Past chats** (↔ **Back to chat**)
and **New chat** before the bell. There is no floating launcher or panel on
phones.

Before the first message the thread shows `AgentHome`:

- **Summary card** (`AgentSummaryCard`), a link to Bills filtered to this
  month: "{Month} so far", the month total (`/spend-items/summary`,
  `period=month`), the bill count, and "· N to review" when extracted bills are
  waiting (same inbox query as the bell). Skeleton while loading.
- A muted line, "Ask about your spending. Answers come from your confirmed
  bills.", then the three example questions as rounded outline chips that
  wrap, sitting just above the composer. A chip sends its question.

The composer doesn't take focus on load, so the keyboard stays down until the
user taps it.

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
