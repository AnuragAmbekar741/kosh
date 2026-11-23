# Storybook

Storybook documents the components new screens should be built from. It lives in
`apps/web` and renders with the app's own Vite config, tokens and fonts.

```bash
cd apps/web
pnpm storybook        # http://localhost:6006
pnpm build-storybook  # static build in storybook-static/
```

## What's in it

| Section         | Contents                                                                                               | Where the stories live                |
| --------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| Foundations     | Colours, category tints, type scale, radius, read from the CSS variables in `src/app/index.css`        | `src/stories/Foundations.stories.tsx` |
| Core / Actions  | Button (every variant and size), Toggle, ToggleGroup                                                   | `src/components/ui/*.stories.tsx`     |
| Core / Forms    | Field, Input, InputGroup, Textarea, Label, Calendar                                                    | `src/components/ui/*.stories.tsx`     |
| Core / Feedback | Alert, Badge, Empty, Skeleton, Spinner, Toast                                                          | `src/components/ui/*.stories.tsx`     |
| Core / Overlays | Dialog, Sheet, Popover, DropdownMenu, Tooltip                                                          | `src/components/ui/*.stories.tsx`     |
| Core / Layout   | Card, Separator, Table, Pagination, Accordion                                                          | `src/components/ui/*.stories.tsx`     |
| Core / Chat     | Message, Bubble, MessageScroller, Marker                                                               | `src/components/ui/*.stories.tsx`     |
| Core / Charts   | ChartContainer with tooltip and legend                                                                 | `src/components/ui/chart.stories.tsx` |
| Finance         | CategoryBadge, ItemBadge, ItemPicker, DatePicker, analytics tiles and charts, AgentBillCard, skeletons | next to each component                |
| Brand           | FinanceMark, EngravedWordmark, ContourField, ContourRings                                              | next to each component                |

Screens and large sections (SpendingAccordion, DocumentReview, FilterMenu,
navigation, AuthShell) are not in Storybook yet.

## How it's wired

- **Theme**: the toolbar's Theme switch drives the app's `ThemeProvider`, so
  stories get the same `light` / `dark` class on `<html>` as the app. Dark is
  the default.
- **Viewport**: a Phone (390 × 844) and a Tablet option, for phone-first
  components.
- **Data**: no story calls the API. `src/stories/mock-api.ts` gives the shared
  axios client an adapter that answers from `src/stories/fixtures.ts`, and each
  story gets a fresh TanStack Query cache and a `MemoryRouter`. Override a
  route for one story with `parameters.mockApi`:

  ```tsx
  export const NothingToReview: Story = {
    parameters: { mockApi: { "GET /documents": [] } },
  }
  ```

- **Fixtures**: line text is raw bill text; catalog items are tags only.

## Adding a story

1. Put `<Name>.stories.tsx` next to the component.
2. Title it `Core/<Group>/<Name>`, `Finance/<Name>` or `Brand/<Name>`. Docs
   pages come from the global `autodocs` tag.
3. Cover every variant and size (inline-radio controls from the `cva` lists),
   disabled, loading, empty and long-text cases.
4. Write the story the way app code should look, because people copy from
   **Show code**: semantic tokens, core components, no raw hex.
5. Base UI triggers take a `render` prop, not `asChild`.
