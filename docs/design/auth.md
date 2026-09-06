# Auth screens

Operate-mode login and signup in a Dribbble-style split stage. Token map: [global.md](./global.md).

## Routes

| Path | Page |
|---|---|
| `/` | Redirect to `/login` |
| `/login` | [`LoginPage`](../../apps/web/src/pages/auth/LoginPage.tsx) |
| `/signup` | [`SignupPage`](../../apps/web/src/pages/auth/SignupPage.tsx) |

Shared chrome: [`AuthShell`](../../apps/web/src/components/auth/AuthShell.tsx) + [`AuthPanel`](../../apps/web/src/components/auth/AuthPanel.tsx).

- Full viewport split (no inset card). Form left on canvas; `#DAEFFA` panel right from `lg` up, flush to the edges. Below `lg`, panel is hidden.
- Panel: headline plus slow blurred blobs. Motion off under `prefers-reduced-motion`.
- Header: Finance mark + hint + outline switch (`Sign up` / `Log in`). Footer copyright on the form column.
- Form: Lucide tile, title, fields, primary Continue, “or”, Google outline.
- Password: [`AuthPasswordField`](../../apps/web/src/components/auth/AuthPasswordField.tsx) with show/hide.

## Fields

- Login: email, password
- Signup: name, email, password (matches `RegisterRequest`; no confirm-password)

## Status

UI only. Forms `preventDefault`. Google is a button with no GIS / `POST /auth/google` yet. Do not add `src/api/auth/auth.ts` or `src/hooks/auth/` until wiring is requested.
