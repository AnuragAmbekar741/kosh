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
Primary controls use the solid `--primary` blue in both themes. The gradient is
reserved for the auth canvas and uses tonal values from the same ice-blue
family.
Document intake uses a dedicated flat, cool-tinted canvas in both themes. This
keeps the task surface calm without borrowing the auth gradient or waveform art.
The shared primary is ice blue `#DAEFFA`, with near-black foreground text for
accessible contrast. On light surfaces, links and accent glyphs use the darker
same-hue `--brand-ink`; dark surfaces map it back to ice blue. Geist carries
headings, UI, and body copy.

## Components

Use shadcn primitives in `apps/web/src/components/ui/`.
[auth.md](./auth.md) describes the implemented login and signup screens.

## Typeset

Geist is the app font. Raleway / Nunito Sans are scoped to
`.typeset-changelog` for a future markdown surface:

```tsx
<div className="typeset typeset-changelog max-w-[37em]">{content}</div>
```

Use `not-typeset` or `data-not-typeset` for embedded widgets.
