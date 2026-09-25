# Spending redesign — Claude Design prompt

Paste everything inside the fence into Claude Design. Brief built with the
Impeccable `shape` flow (Operate mode) against `DESIGN.md`, `global.md`,
`spending.md`, and `PRODUCT.md`.

```text
Redesign the Spending page of Kosh, a personal spend ledger web app. Produce high-fidelity artboards. This is a product screen (Operate mode): the user scans, logs, confirms, leaves. Calm, dense, clinical — Linear-grade product UI. Familiar beats clever.

## The core change
Split the page into two fully separate tabs under one route:
1. Analytics (default tab) — understand the period.
2. Transactions — the ledger (bills/items), where editing happens.
No analytics appear on the Transactions tab, and no ledger rows appear on the Analytics tab.
Use the sample data below exactly as given so every artboard shows the same numbers. Currency is USD.

Remove entirely: month-over-month comparison ("+12% vs August"), any delta %, up/down arrows, green/red trend text, the stacked category mix bar, and the row of category chips under the total. Numbers describe the selected period only. No comparisons anywhere.

## Page skeleton (top to bottom)
- App shell (keep): inset sidebar left (Kosh mark, Overview, Spending active), header bar with page title "Spending" and a primary "Add spending" button on the right.
- Shared period bar: connected segmented control Day | Week | Month, then Custom (opens a two-month range picker), prev/next chevrons, and the period label ("September 2026"). On the right: Category (multi-select dropdown) and Source (All sources / Manual / Document). These apply to BOTH tabs, and switching tabs keeps them.
- Tabs row directly below: "Analytics" | "Transactions", underline-style tabs (not pills, not boxed buttons). Active tab = foreground text + 2px underline; inactive = muted text.
- Tab content fills the remaining height. The page itself never scrolls; inner panels do.

## Analytics tab
Reading order: total → shape over time → where it went.

1. Hero figure: one big total, "$2,847.63" (40px, semibold, tabular numerals, -1px tracking). Under it one muted line: "23 bills · 141 items · $123.81 avg per bill". Nothing else in this row — no comparison, no badge.

2. Spend over time (full width, ~220px tall): a simple vertical bar chart for the selected period only.
   - Week → 7 daily bars (Mon–Sun). Month → one bar per day (1–30). Custom ≤ 31 days → daily; longer → weekly bars.
   - Day period → no chart. Show that day's items as a compact list instead.
   - Bars are monochrome (foreground at ~35% opacity); the hovered bar goes to full foreground with a small tooltip: "Thu, 11 Sep · $412.80 · 3 bills". Zero days render as a 2px stub on the baseline so the rhythm reads.
   - Minimal axes: 3 faint horizontal gridlines with compact labels ($0, $200, $400), sparse x labels (1, 8, 15, 22, 29). No legend, no gradient, no area fill, no rounded pill bars (2px corner radius max).
   - Clicking a bar switches to Transactions with period = that day.

3. Three equal panels in a row (stack vertically below 1024px):
   a. Categories — ranked list, biggest first. Each row: colored swatch dot, name, amount (right, tabular), share % (muted), and a thin 4px horizontal bar underneath filled in that category's color, width = share. Clicking a row toggles the Category filter (selected row gets a check and a hairline ring; others dim).
      Data: Food $912.40 32% · Shopping $604.18 21% · Transport $388.20 14% · Utilities $296.55 10% · Health $254.10 9% · Entertainment $180.00 6% · Travel $112.20 4% · Other $100.00 4%.
   b. Top merchants — top 5: merchant name, muted "6 bills", amount right.
      Trader Joe's $486.12 (6 bills) · Amazon $402.77 (4) · PG&E $188.40 (1) · Uber $146.30 (9) · Walgreens $121.85 (2).
   c. Biggest items — top 5 single line items: item name, muted "Merchant · 11 Sep", category badge, amount right.
      Noise-cancelling headphones — Amazon · 4 Sep — Shopping — $249.00; Electricity bill — PG&E · 2 Sep — Utilities — $188.40; Flight SFO→LAX — Alaska · 18 Sep — Travel — $112.20; Dental cleaning — Bright Dental · 9 Sep — Health — $95.00; Concert tickets — Ticketmaster · 20 Sep — Entertainment — $90.00.
   Panels: surface-1 fill, 1px hairline, 12px radius, 20–24px padding, small 13px medium-weight panel titles. Each panel has a quiet "View in Transactions" text link that applies the matching filter and switches tabs.

## Transactions tab
The existing ledger, cleaned up, with no summary strip above it.
- Toolbar row: Bills | Items segmented toggle, entry count ("23 bills"), search input on the right (search lives only on this tab).
- Bills view: accordion list in a 1px bordered card with a 12px radius. Each bill row: icon tile (document icon, or pencil for manual), merchant name, outline pill badges for date / source / item count, tinted category badges, total right-aligned, kebab menu. Show Trader Joe's (11 Sep 2026 · Document · 11 items · Food, Other · $86.42) expanded, with nested line items indented to the merchant text column, quieter type, a category badge next to each name, and amounts right. End the expanded bill with an "Add item" row.
- Items view: a read-only dense table — Date, Item, Merchant, Category, Source, Amount — with a pager footer "Showing 1–50 of 141".

## Visual system (keep; do not invent a second one)
- Font: Geist for everything. Tabular numerals for every amount. Type scale: 40 / 28 / 20 / 16 / 14 / 13 / 12.
- Dark is the default theme. Dark tokens: canvas #010102, surface-1 #0f1011, surface-2 #141516, muted #18191a, hairline #23252a, ink #f7f8f8, ink-muted #d0d6e0, ink-subtle #8a8f98. Primary is monochrome: near-white #f7f8f8 on dark (dark text on it).
- Light theme: canvas #ffffff, surface #f5f6f6, surface-2 #e8eaed, hairline #e4e5e6, ink #000000, muted text #62666d, primary #3a3a3c.
- Category colors are the ONLY chromatic marks on the page (soft fill + matching ink, always with a text label):
  Dark: food #2a2114/#e0b15a, transport #172433/#8bb4e0, housing #142422/#6fcfc4, entertainment #221c33/#c4b0e8, shopping #2a181c/#e8a0b0, health #14241c/#6fcf9a, utilities #2a2414/#d4c06a, travel #142428/#6fc4d4, other #18191a/#8a8f98.
  Light: food #f8ebd0/#8a5a12, transport #dce8f8/#1d4f8c, housing #d5edea/#0f5c56, entertainment #e8e0f6/#5b3a9e, shopping #f8e0e6/#9a2e4a, health #d8f0e4/#146644, utilities #f5ebc0/#7a5b10, travel #d4eef3/#0e6674, other #eef0f1/#4a4e55.
  In Analytics, swatch dots and share bars use the category ink color.
- Flat: depth comes from surface tones and 1px hairlines. No drop shadows, no glass, no gradients.
- Radii: 8px controls, 12px cards. Primary buttons are never pills. Lucide icons only. 44px minimum touch targets on mobile.
- Motion: 150–200ms state changes only (tab underline slide, bar hover, accordion height). No load choreography.

## Artboards
1. Analytics · Month · Desktop 1440×900 · Dark
2. Analytics · Month · Desktop 1440×900 · Light
3. Analytics · Week · Food selected as a category filter (chart and panels reflect it; the Categories row shows the selected state)
4. Transactions · Bills · Trader Joe's expanded · Dark
5. Transactions · Items table · Dark
6. Mobile 390×844 · Analytics (tabs stay at the top; Category/Source collapse into one "Filters" button that opens a sheet; the three panels stack; the chart scrolls horizontally only if the month needs it)
7. Mobile 390×844 · Transactions · Bills
8. States sheet: Analytics loading skeleton (shapes match the final layout), first-use empty ("No spending yet" plus an Add spending button, period bar disabled), and filtered empty ($0.00 muted, "Nothing matches" plus Clear filters)

## Anti-goals
No month-over-month or any "vs" comparison. No KPI card grid of four identical tiles. No donut or pie chart. No purple gradients, no AI-beige, no Inter, no emoji, no second brand accent, no shadows on dark, no pill-shaped primary buttons, no decorative charts in the chrome.
```

## Notes for implementation (not for Claude Design)

- URL gains `tab=analytics|transactions`. Omit it when it's `analytics`, the default, to match the other defaults in `useSpendFilters`.
- `GET /spend-items/summary` doesn't return daily series, top merchants, or biggest items yet. Either extend the summary payload (preferred) or compute them client-side from `GET /spend-items?limit=200`. Drop `comparison` from the UI; the field can stay in the API.
- Update `docs/design/spending.md` ("Filters and summary") when this ships. The mix bar, chips, and comparison copy go away.
