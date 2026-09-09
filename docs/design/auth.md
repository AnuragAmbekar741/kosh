# Auth screens

Operate-mode login and signup in a calm split stage. Token map: [global.md](./global.md).

## Routes

| Path | Page |
|---|---|
| `/` | Signed-in stub ([`HomePage`](../../apps/web/src/pages/home/HomePage.tsx)); guests redirect to `/login` |
| `/login` | [`LoginPage`](../../apps/web/src/pages/auth/LoginPage.tsx); signed-in users redirect to `/` |
| `/signup` | [`SignupPage`](../../apps/web/src/pages/auth/SignupPage.tsx); signed-in users redirect to `/` |

Shared chrome: [`AuthShell`](../../apps/web/src/components/auth/AuthShell.tsx) + [`AuthPanel`](../../apps/web/src/components/auth/AuthPanel.tsx).

- Full viewport 56/44 split (no inset card). The theme-aware brand area is left and the form is right from `lg` up, both flush to the edges. Below `lg`, the brand area is hidden.
- Canvas: a seamless light or dark tonal background across both columns, with concise product copy and a slow ice-blue waveform inspired by bill and spending flows. The line field continues quietly behind the form, and reduced motion keeps it static.
- Separation: use spacing and tonal falloff, not a hard vertical rule.
- Motion: stagger the heading, credentials, and social action on route entry; keep the login/sign-up switch behavior and respect reduced-motion preferences.
- Geist carries all auth typography. Ice blue `#DAEFFA` is the only brand accent; surfaces and hierarchy stay charcoal and flat.
- Header: Finance mark + hint + outline switch (`Sign up` / `Log in`). Footer copyright on the form column.
- Form: Lucide tile, title, fields, solid-primary Continue, “or”, full-width Google GIS button when `VITE_GOOGLE_CLIENT_ID` is set.
- Login/signup navigation remounts the shared form content with a short staggered tween from above; no spring or bounce. Reduced motion disables the transition.
- Password: [`AuthPasswordField`](../../apps/web/src/components/auth/AuthPasswordField.tsx) with show/hide.
- Validation: `useForm` + zod. Login: email + required password. Signup: name, email, password min 8. Field errors via `FieldError`; API `detail` is a form-level error.

## Fields

- Login: email, password
- Signup: name, email, password (matches `RegisterRequest`; no confirm-password)

## Status

Wired to the API. `src/api/auth/auth.ts` + `src/hooks/auth/use-auth.ts`. Session via `GET /users/me` (refresh cookie on 401). Google GIS posts `{ id_token }` to `POST /auth/google`.
