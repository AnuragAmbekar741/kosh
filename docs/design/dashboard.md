# Signed-in dashboard

This document is the source of truth for signed-in web chrome. Authenticated
users land in a collapsible sidebar shell with the ledger on the right. Tokens
stay those in [global.md](./global.md). Do not reuse the authentication
gradient or waveform on signed-in surfaces.

## Experience

The signed-in product is Operate-mode: scan, move, come back. Brand lives in
precise details — monochrome primary, Geist, flat 1px hairlines — not in
marketing chrome.

This step ships layout only. Overview and Spending are empty destinations so
the shell can land first.

## Navigation

| Path | Page | Notes |
| --- | --- | --- |
| `/` | Redirect | Signed-in users go to `/overview`. Guests go to `/login`. |
| `/overview` | Overview | Empty shell. Future totals and breakdowns. |
| `/spending` | Spending | Empty shell. Future spend ledger. |

Primary destinations live in
[`src/components/layout/navigation.ts`](../../apps/web/src/components/layout/navigation.ts).
The sidebar and the header title both read from that list.

The sidebar uses the shadcn `Sidebar` primitive (`variant="inset"`,
`collapsible="icon"`). Collapsing leaves a 3rem icon rail; labels remain
reachable as tooltips. Collapse state persists in the `sidebar_state` cookie
and toggles with `Cmd/Ctrl+B`. Below `768px` the same nav opens as a sheet.

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
src/components/layout/         AppShell, AppSidebar, AppHeader, NavMain, NavUser, navigation.ts
src/components/brand/          FinanceMark (shared with auth)
src/components/ui/sidebar.tsx  shadcn Sidebar (Base UI)
```

Auth, API, and query hooks are unchanged. Feature UI belongs in
`src/components/<feature>/` when it exists — not in `layout/`.
