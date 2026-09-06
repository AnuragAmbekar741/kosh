---
name: Linear-design-analysis
description: "Dark product canvas from Linear’s DESIGN.md, with dusty teal as the single chromatic accent. Marketing chrome stays charcoal; the app shell uses the same tokens via shadcn CSS variables."
colors:
  primary: "#0F766E"
  on-primary: "#ffffff"
  primary-hover: "#0D9488"
  primary-focus: "#115E59"
  ink: "#f7f8f8"
  ink-muted: "#d0d6e0"
  ink-subtle: "#8a8f98"
  ink-tertiary: "#62666d"
  canvas: "#010102"
  surface-1: "#0f1011"
  surface-2: "#141516"
  surface-3: "#18191a"
  surface-4: "#191a1b"
  hairline: "#23252a"
  hairline-strong: "#34343a"
  hairline-tertiary: "#3e3e44"
  inverse-canvas: "#ffffff"
  inverse-surface-1: "#f5f6f6"
  inverse-surface-2: "#f6f7f7"
  inverse-ink: "#000000"
  brand-secure: "#5F8F8A"
  semantic-success: "#27a644"
  semantic-overlay: "#000000"
typography:
  display-xl: { fontFamily: Geist, fontSize: 80px, fontWeight: 600, lineHeight: 1.05, letterSpacing: -3.0px }
  display-lg: { fontFamily: Geist, fontSize: 56px, fontWeight: 600, lineHeight: 1.10, letterSpacing: -1.8px }
  display-md: { fontFamily: Geist, fontSize: 40px, fontWeight: 600, lineHeight: 1.15, letterSpacing: -1.0px }
  headline: { fontFamily: Geist, fontSize: 28px, fontWeight: 600, lineHeight: 1.20, letterSpacing: -0.6px }
  card-title: { fontFamily: Geist, fontSize: 22px, fontWeight: 500, lineHeight: 1.25, letterSpacing: -0.4px }
  subhead: { fontFamily: Geist, fontSize: 20px, fontWeight: 400, lineHeight: 1.40, letterSpacing: -0.2px }
  body-lg: { fontFamily: Geist, fontSize: 18px, fontWeight: 400, lineHeight: 1.50, letterSpacing: -0.1px }
  body: { fontFamily: Geist, fontSize: 16px, fontWeight: 400, lineHeight: 1.50, letterSpacing: -0.05px }
  body-sm: { fontFamily: Geist, fontSize: 14px, fontWeight: 400, lineHeight: 1.50, letterSpacing: 0 }
  caption: { fontFamily: Geist, fontSize: 12px, fontWeight: 400, lineHeight: 1.40, letterSpacing: 0 }
  button: { fontFamily: Geist, fontSize: 14px, fontWeight: 500, lineHeight: 1.20, letterSpacing: 0 }
  eyebrow: { fontFamily: Geist, fontSize: 13px, fontWeight: 500, lineHeight: 1.30, letterSpacing: 0.4px }
  mono: { fontFamily: ui-monospace, fontSize: 13px, fontWeight: 400, lineHeight: 1.50, letterSpacing: 0 }
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 24px
  pill: 9999px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 8px 14px
  button-primary-pressed:
    backgroundColor: "{colors.primary-focus}"
    textColor: "{colors.on-primary}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 8px 14px
  button-tertiary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 8px 14px
  button-inverse:
    backgroundColor: "{colors.inverse-canvas}"
    textColor: "{colors.inverse-ink}"
    rounded: "{rounded.md}"
    padding: 8px 14px
  pricing-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 24px
  pricing-card-featured:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 24px
  feature-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 24px
  product-screenshot-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: 24px
  testimonial-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 32px
  customer-logo-tile:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-subtle}"
    rounded: "{rounded.xs}"
    padding: 16px
  text-input:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  text-input-focused:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  pricing-tab-default:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-subtle}"
    rounded: "{rounded.pill}"
    padding: 6px 14px
  pricing-tab-selected:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: 6px 14px
  cta-banner:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 48px
  changelog-row:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xs}"
    padding: 24px 0
  status-badge:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    padding: 2px 8px
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    height: 56px
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-subtle}"
    padding: 64px 32px
---

# Global design

Source of truth for `apps/web` tokens and component contracts. shadcn primitives consume the CSS variables in [`apps/web/src/index.css`](../../apps/web/src/index.css). Do not put raw hex on components.

Dark is the default (`ThemeProvider defaultTheme="dark"`). Light uses Linear `inverse-*` tokens.

App chrome uses Geist (nova). Typeset markdown uses Raleway / Nunito Sans via `.typeset-changelog` — do not apply that class until a markdown surface is chosen.

## Token → CSS

| Linear | shadcn (`.dark`) |
|---|---|
| `canvas` `#010102` | `--background` |
| `ink` `#f7f8f8` | `--foreground` |
| `surface-1` `#0f1011` | `--card`, `--popover`, `--sidebar` |
| `surface-2` `#141516` | `--secondary`, `--accent` |
| `surface-3` `#18191a` | `--muted` |
| `hairline` `#23252a` | `--border`, `--input` |
| `primary` `#0F766E` | `--primary` |
| `on-primary` `#ffffff` | `--primary-foreground` |
| `ink-subtle` `#8a8f98` | `--muted-foreground` |
| `primary-focus` `#115E59` | `--ring` |
| `rounded.md` `8px` | `--radius` `0.5rem` |

`:root` (light) maps to `inverse-canvas` / `inverse-ink` / `inverse-surface-*`. Same teal primary.

## Component entries

Add the listed shadcn primitive when the surface is built. Keep the visual contract.

| DESIGN.md token | shadcn (when added) | Contract |
|---|---|---|
| `button-primary` | `Button` | `--primary`, 8px radius, 8×14 padding |
| `button-primary-hover` | `Button` hover | `#0D9488` |
| `button-primary-pressed` | `Button` active | `#115E59` |
| `button-secondary` | `Button variant="secondary"` | surface-1 + hairline |
| `button-tertiary` | `Button variant="ghost"` | canvas, ink text |
| `button-inverse` | `Button` on inverse | white fill, black text |
| `pricing-card` / `feature-card` | `Card` | surface-1, 12px, 24px pad |
| `pricing-card-featured` | `Card` | surface-2 lift |
| `product-screenshot-card` | `Card` | 16px radius |
| `testimonial-card` | `Card` | 32px pad |
| `customer-logo-tile` | — | canvas, caption, 4px |
| `text-input` / `text-input-focused` | `Input` in `Field` | surface-1, 8px, 2px ring |
| `pricing-tab-default` / `selected` | `ToggleGroup` | pill, surface lift when selected |
| `cta-banner` | `Card` | 48px pad, headline |
| `changelog-row` | list row | canvas, hairline bottom |
| `status-badge` | `Badge` | pill, surface-2 |
| `top-nav` | later `Sidebar` | 56px, canvas |
| `footer` | — | canvas, caption |

## Typeset

Installed, not applied. Preset class: `.typeset-changelog`. Wrap later as:

```tsx
<div className="typeset typeset-changelog max-w-[37em]">{content}</div>
```

Opt out of embedded widgets with `not-typeset` or `data-not-typeset`.

## Do / don't

- Accent only on mark, primary CTA, focus ring, and links.
- Hierarchy via the surface ladder + 1px hairline. No drop shadows on dark.
- No pill primary CTAs. No second chromatic marketing color.
- No emoji icons (Lucide). Touch targets ≥44px. Visible focus rings.
