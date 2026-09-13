# Global design implementation

This file owns tokens and visual rules, and maps them to
[app CSS](../../apps/web/src/app/index.css). Use semantic Tailwind classes in components.

## Dark token mapping

| Design token | CSS variable |
|---|---|
| `canvas` | `--background` |
| `document-canvas` | `--document-canvas` |
| `ink` | `--foreground` |
| `surface-1` | `--card`, `--popover`, `--sidebar` |
| `surface-2` | `--secondary`, `--accent` |
| `surface-3` | `--muted` |
| `hairline` | `--border`, `--input` |
| `primary` | `--primary` |
| accessible accent foreground | `--brand-ink` |
| `auth page background` | `--auth-page-background` |
| `on-primary` | `--primary-foreground` |
| `ink-subtle` | `--muted-foreground` |
| `primary-focus` | `--ring` |
| `rounded.md` | `--radius` |

Dark is the default. Light uses inverse tokens. Tailwind radius utilities are derived
from `--radius`; their suffixes do not directly match the design token names.
Primary inverts against the canvas: near-black `#0a0a0a` on light, near-white
`#f7f8f8` on dark. `--primary-foreground` is the opposite ink. `--brand-ink`
and `--ring` stay in the same neutral family so links, focus, and primary
actions never introduce a second hue. The auth canvas uses gray tonal
gradients and a gray waveform. Document intake uses a flat neutral canvas.
Geist carries headings, UI, and body copy. Semantic `--destructive` and
`--chart-2` (success) stay chromatic.

## Components

Use shadcn primitives in `apps/web/src/components/ui/`.
[auth.md](./auth.md) describes the implemented login and signup screens.

### Buttons

Buttons use more horizontal than vertical space so actions read as sleek controls rather than square tiles. Text buttons use 16px horizontal padding at the default size and compact to 36px tall from `sm` upward. Below `sm`, the same controls retain a 44px touch target. Large buttons are 40px tall on desktop with 20px horizontal padding. Icon-only buttons remain square because the shape communicates a single glyph target, but they follow the same 44px mobile and compact desktop sizing rule.

Full-width form actions may use a 40px desktop height while keeping 44px on mobile. Feature code should select a shared size variant before adding local height or padding overrides.

## Typeset

Geist is the app font. Raleway / Nunito Sans are scoped to
`.typeset-changelog` for a future markdown surface:

```tsx
<div className="typeset typeset-changelog max-w-[37em]">{content}</div>
```

Use `not-typeset` or `data-not-typeset` for embedded widgets.
