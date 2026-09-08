# Auth screens

Operate-mode login and signup in a Dribbble-style split stage. Token map: [global.md](./global.md).

## Routes

| Path | Page |
|---|---|
| `/` | Signed-in stub ([`HomePage`](../../apps/web/src/pages/home/HomePage.tsx)); guests redirect to `/login` |
| `/login` | [`LoginPage`](../../apps/web/src/pages/auth/LoginPage.tsx); signed-in users redirect to `/` |
| `/signup` | [`SignupPage`](../../apps/web/src/pages/auth/SignupPage.tsx); signed-in users redirect to `/` |

Shared chrome: [`AuthShell`](../../apps/web/src/components/auth/AuthShell.tsx) + [`AuthPanel`](../../apps/web/src/components/auth/AuthPanel.tsx).

- Full viewport 44/56 split (no inset card). Form left on canvas; gradient panel right from `lg` up, flush to the edges. Below `lg`, panel is hidden.
- Panel: primary depth gradient, oversized single-line editorial headline, two-line supporting copy, and slow contour lines with a restrained multi-blue stroke gradient. Reduced motion keeps the lines static.
- Auth headings use Raleway at weight 300; form labels, actions, and body copy use Geist at 400. Keep the existing split layout and calm cornflower-blue palette.
- Header: Finance mark + hint + outline switch (`Sign up` / `Log in`). Footer copyright on the form column.
- Form: Lucide tile, title, fields, solid-primary Continue, “or”, full-width Google GIS button when `VITE_GOOGLE_CLIENT_ID` is set.
- Login/signup navigation remounts the shared form content with a 450ms tween from 20px above; no spring or bounce. Reduced motion disables the transition.
- Password: [`AuthPasswordField`](../../apps/web/src/components/auth/AuthPasswordField.tsx) with show/hide.
- Validation: `useForm` + zod. Login: email + required password. Signup: name, email, password min 8. Field errors via `FieldError`; API `detail` is a form-level error.

## Fields

- Login: email, password
- Signup: name, email, password (matches `RegisterRequest`; no confirm-password)

## Status

Wired to the API. `src/api/auth/auth.ts` + `src/hooks/auth/use-auth.ts`. Session via `GET /users/me` (refresh cookie on 401). Google GIS posts `{ id_token }` to `POST /auth/google`.
