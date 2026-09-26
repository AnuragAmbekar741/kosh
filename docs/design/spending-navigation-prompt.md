# Spending navigation exploration — Claude Design prompt

Companion to [spending-redesign-prompt.md](./spending-redesign-prompt.md).
Paste everything inside the fence into the same Claude Design project.

```text
Explore navigation patterns for the Kosh Spending page. Content and visual system stay exactly as in the Spending redesign already in this project (Geist, dark first, monochrome primary, category colors as the only chroma, flat 1px hairlines, 8px controls / 12px cards). Do not restyle anything. Only the way the user moves between views changes.

## Views to navigate between
1. Analytics: total, spend-over-time bars, Categories / Top merchants / Biggest items panels.
2. Bills: accordion ledger grouped by bill (Trader Joe's expanded).
3. Items: flat table of every line item, with pager.

Shared state across all views: period (Day / Week / Month / Custom, prev/next, "September 2026") and filters (Category, Source). Search belongs only to Bills and Items. "Add spending" stays the primary action in the header.

If this project has no Spending artboards yet, use this content: total $2,847.63, 23 bills, 141 items, categories Food $912.40 / Shopping $604.18 / Transport $388.20 / Utilities $296.55 / Health $254.10 / Entertainment $180.00 / Travel $112.20 / Other $100.00.

## Two hierarchy options, tested across the patterns
- Nested: Analytics | Transactions, with a Bills / Items toggle inside Transactions.
- Flat: Analytics | Bills | Items as three peers.
Each pattern below states which one it uses. Patterns B and D show both.

## Patterns (one desktop artboard each, 1440×900, dark, Analytics active)
A. Underline tabs: tabs directly under the period bar. Nested hierarchy. This is the baseline.
B. Header segmented control: the view switch sits in the header beside the "Spending" title, and the period bar sits below it in the content. Show flat (3 segments) and nested (2 segments + inner toggle) side by side.
C. Sidebar sub-nav: Spending expands in the app sidebar into Analytics / Bills / Items as indented children. Each is its own route. The content header shows only the period bar. Also show the collapsed 48px icon-rail state, where the children appear in a hover flyout.
D. Title view switcher: the header title becomes "Spending / Analytics ▾", opening a small menu of views with keyboard hints (1, 2, 3). Show the menu open. Flat and nested.
E. In-panel vertical rail: a narrow 160px list of views on the left edge of the content panel, with the period bar spanning the content to its right. Flat hierarchy.
F. Tabs above the period bar: tabs at the top of the content, with the period bar under them, scoped visually to the tab content. Nested hierarchy. This tests whether the period reads as per-tab or global.

For every pattern, add a second artboard of the same layout with Bills active and Trader Joe's expanded, so switching cost and layout stability are visible. The period bar, filters, and header must not jump position between views. Call out any shift.

## Mobile (390×844) for each pattern
Show how it adapts: tabs/segments stay in a sticky top row, the sidebar sub-nav moves into the nav sheet, the title switcher opens a bottom sheet, and the vertical rail becomes a segmented row. Category and Source collapse into one Filters button.

## Comparison sheet (final artboard)
A table with one row per pattern. Columns:
- clicks to reach each view
- whether period/filters read as shared
- where the view name is visible
- desktop layout stability
- mobile fit
- keyboard access
- risk (for example, "hidden in a menu" or "sidebar gets crowded as more sections arrive")
Finish with a one-line recommendation and the runner-up.

## Rules
- The active view is always named in text. Color is never the only signal: use a foreground plus underline, bg-accent plus medium weight, or a check mark.
- Keep the controls standard. No invented widgets, no pill primary buttons, no icon-only view switches without labels.
- Motion is 150–200ms state change only, such as an underline slide or segment highlight.
- No comparisons ("vs August"), shadows on dark, gradients, emoji, or second accent color.
```
