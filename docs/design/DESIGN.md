---
name: Linear-design-analysis
description: "Dark product canvas from Linear’s DESIGN.md, with ice blue #DAEFFA as the single chromatic accent. Marketing chrome stays charcoal; the app shell uses the same tokens via shadcn CSS variables."
colors:
  primary: "#DAEFFA"
  on-primary: "#010102"
  primary-hover: "#E8F6FC"
  primary-focus: "#9FD0E8"
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
  brand-secure: "#7A9AA8"
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
  button-primary: {backgroundColor: '{colors.primary}', textColor: '{colors.on-primary}', typography: '{typography.button}', rounded: '{rounded.md}', padding: 8px 14px}
  button-primary-pressed: {backgroundColor: '{colors.primary-focus}', textColor: '{colors.on-primary}'}
  button-primary-hover: {backgroundColor: '{colors.primary-hover}', textColor: '{colors.on-primary}'}
  button-secondary: {backgroundColor: '{colors.surface-1}', textColor: '{colors.ink}', rounded: '{rounded.md}', padding: 8px 14px}
  button-tertiary: {backgroundColor: '{colors.canvas}', textColor: '{colors.ink}', rounded: '{rounded.md}', padding: 8px 14px}
  button-inverse: {backgroundColor: '{colors.inverse-canvas}', textColor: '{colors.inverse-ink}', rounded: '{rounded.md}', padding: 8px 14px}
  pricing-card: {backgroundColor: '{colors.surface-1}', textColor: '{colors.ink}', rounded: '{rounded.lg}', padding: 24px}
  pricing-card-featured: {backgroundColor: '{colors.surface-2}', textColor: '{colors.ink}', rounded: '{rounded.lg}', padding: 24px}
  feature-card: {backgroundColor: '{colors.surface-1}', textColor: '{colors.ink}', rounded: '{rounded.lg}', padding: 24px}
  product-screenshot-card: {backgroundColor: '{colors.surface-1}', textColor: '{colors.ink}', rounded: '{rounded.xl}', padding: 24px}
  testimonial-card: {backgroundColor: '{colors.surface-1}', textColor: '{colors.ink}', rounded: '{rounded.lg}', padding: 32px}
  customer-logo-tile: {backgroundColor: '{colors.canvas}', textColor: '{colors.ink-subtle}', rounded: '{rounded.xs}', padding: 16px}
  text-input: {backgroundColor: '{colors.surface-1}', textColor: '{colors.ink}', rounded: '{rounded.md}', padding: 8px 12px}
  text-input-focused: {backgroundColor: '{colors.surface-1}', textColor: '{colors.ink}', rounded: '{rounded.md}', padding: 8px 12px}
  pricing-tab-default: {backgroundColor: '{colors.canvas}', textColor: '{colors.ink-subtle}', rounded: '{rounded.pill}', padding: 6px 14px}
  pricing-tab-selected: {backgroundColor: '{colors.surface-2}', textColor: '{colors.ink}', rounded: '{rounded.pill}', padding: 6px 14px}
  cta-banner: {backgroundColor: '{colors.surface-1}', textColor: '{colors.ink}', rounded: '{rounded.lg}', padding: 48px}
  changelog-row: {backgroundColor: '{colors.canvas}', textColor: '{colors.ink}', rounded: '{rounded.xs}', padding: 24px 0}
  status-badge: {backgroundColor: '{colors.surface-2}', textColor: '{colors.ink-muted}', rounded: '{rounded.pill}', padding: 2px 8px}
  top-nav: {backgroundColor: '{colors.canvas}', textColor: '{colors.ink}', height: 56px}
  footer: {backgroundColor: '{colors.canvas}', textColor: '{colors.ink-subtle}', padding: 64px 32px}
---

# Design System: Finance

## Overview

Linear-inspired dark product UI: charcoal surfaces, ice-blue accent, Geist, and flat controls.
Tokens above are the design reference. [global.md](docs/design/global.md) maps them to CSS; [auth.md](docs/design/auth.md) describes auth layouts.

## Colors

- Use semantic Tailwind tokens, never raw hex in components.
- Primary is the only brand accent: mark, primary actions, links, and focus states. Success is semantic only.
- Dark is the default. Light uses inverse canvas, ink, and surface tokens with the same primary.

## Typography

Geist for app UI. Use the named type scale above; no Inter or display serif.
Auth headings may use weight 300; labels and actions stay at 400 for readability.
Raleway / Nunito Sans belong only inside `.typeset-changelog`, never app chrome.

## Layout

Keep task screens compact, predictable, and easy to scan. Page-specific layouts belong in feature docs.

## Elevation & Depth

Use surface tones and 1px hairlines for hierarchy. Both themes stay flat; no drop shadows or glass.

## Shapes

Use `rounded.md` for controls and `rounded.lg` for cards. Primary actions are never pills.

## Components

- Compose shadcn primitives: Button, Card, Input, Field, and Separator.
- Primary actions need visible focus and at least 44px touch targets.
- Inputs use surface-1 and a 2px focus ring; cards use 24px padding.
- Lucide icons only; the Google sign-in mark is the allowed brand SVG.
- Component tokens include reference contracts for future surfaces, not a list of shipped features.

## Do's and Don'ts

- Keep labels short and layout stable.
- No second brand accent, purple gradients, AI-beige, or emoji icons.
- Update tokens here and their CSS implementation together. Do not copy the token record into other docs.
- Preserve the visual identity unless a redesign is requested.
