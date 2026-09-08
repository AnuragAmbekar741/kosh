# Global design implementation

This file owns tokens and visual rules, and maps them to
[app CSS](../../apps/web/src/app/index.css). Use semantic Tailwind classes in components.

## Dark token mapping

| Design token | CSS variable |
|---|---|
| `canvas` | `--background` |
| `ink` | `--foreground` |
| `surface-1` | `--card`, `--popover`, `--sidebar` |
| `surface-2` | `--secondary`, `--accent` |
| `surface-3` | `--muted` |
| `hairline` | `--border`, `--input` |
| `primary` | `--primary` |
| `primary gradient` | `--primary-gradient` |
| `on-primary` | `--primary-foreground` |
| `ink-subtle` | `--muted-foreground` |
| `primary-focus` | `--ring` |
| `rounded.md` | `--radius` |

Dark is the default. Light uses inverse tokens. Tailwind radius utilities are derived
from `--radius`; their suffixes do not directly match the design token names.
Primary controls use the solid `--primary` blue in both themes. The gradient is
reserved for large brand surfaces such as the auth panel.
The shared primary is muted cornflower `#7292D0`, used as the terminal panel
gradient stop, with near-black foreground text for accessible contrast. App
headings use Raleway; UI and body copy remain Geist.

## Components

Use shadcn primitives in `apps/web/src/components/ui/`.
[auth.md](./auth.md) describes the implemented login and signup screens.

## Typeset

Installed, not applied. Geist is the app font; Raleway / Nunito Sans are scoped to
`.typeset-changelog` for a future markdown surface:

```tsx
<div className="typeset typeset-changelog max-w-[37em]">{content}</div>
```

Use `not-typeset` or `data-not-typeset` for embedded widgets.
