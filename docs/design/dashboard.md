# Signed-in dashboard

This document is the source of truth for signed-in web chrome. Authenticated
users land in a collapsible sidebar shell with the ledger on the right. Tokens
stay those in [global.md](./global.md). Do not reuse the authentication
gradient or waveform on signed-in surfaces.

## Experience

The signed-in product is Operate-mode: scan, move, come back. Brand lives in
precise details — monochrome primary, Geist, flat 1px hairlines — not in
marketing chrome.

Overview is an empty destination until analytics exist: a compact dashed
Empty frame, centered in the panel and hugging its copy, with a single CTA
to Spending. Spending contains the document intake,
extraction review, and confirmed ledger described in [spending.md](./spending.md).

While `useGetMe` is pending, the shell renders `DashboardSkeleton` — the same
inset Sidebar chrome with Skeleton placeholders — so the first paint matches
the loaded layout. The status is announced as “Opening your workspace.”

## Navigation

| Path                  | Page      | Notes                                                                         |
| --------------------- | --------- | ----------------------------------------------------------------------------- |
| `/`                   | Redirect  | Signed-in users go to `/overview`. Guests go to `/login`.                     |
| `/overview`           | Overview  | Empty destination. CTA to Spending. Future totals and breakdowns.             |
| `/spending`           | Redirect  | Preserves search params and opens Bills.                                      |
| `/spending/analytics` | Analytics | Reserved; shown as unavailable and redirects to Bills until its screen ships. |
| `/spending/bills`     | Bills     | Existing grouped bill ledger.                                                 |
| `/spending/items`     | Items     | Existing item table and pager.                                                |

Primary destinations live in
[`src/components/layout/navigation/navigation.ts`](../../apps/web/src/components/layout/navigation/navigation.ts).
The sidebar and the header title both read from that list.

The sidebar uses the shadcn `Sidebar` primitive (`variant="inset"`,
`collapsible="icon"`). Spending is a parent row with Analytics, Bills, and
Items beneath it; clicking the parent expands or collapses that subtree.
Analytics remains visibly unavailable until implemented. Collapsing leaves a
3rem icon rail: hovering or activating the centered Spending icon
opens a keyboard-accessible `DropdownMenu` containing the same children.
Collapse state persists in the `sidebar_state` cookie and toggles with
`Cmd/Ctrl+B`. Below `768px` the expandable hierarchy appears in the existing
nav sheet.

The inset panel is locked to the viewport (`h-svh`, inset margin subtracted
on `md+`). The header stays put; page content fills the remaining height
with `overflow-hidden`, so Overview and Spending do not scroll the page.

The account menu sits in the sidebar footer: name, email, and Sign out.
Settings is out of this step.

## Visual rules

- Sidebar canvas matches `--background`. The inset panel (and the mobile
  sheet) uses `--card` so it lifts off the page. A 1px hairline, never a drop
  shadow.
- The active nav item uses `bg-sidebar-accent` plus medium weight. Color is
  never the only signal. Do not fill the row with primary.
- Geist and the monochrome tokens from `global.md`. No pills, no glass, no
  decorative charts in the chrome.
- Motion is the 200ms sidebar width transition only. Honor
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
