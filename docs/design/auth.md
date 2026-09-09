# Auth screens

Operate-mode login and signup in a calm split stage. Token map: [global.md](./global.md).

## Routes

| Path      | Page                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------- |
| `/`       | Signed-in stub ([`HomePage`](../../apps/web/src/pages/home/HomePage.tsx)); guests redirect to `/login`  |
| `/login`  | [`AuthPage`](../../apps/web/src/pages/auth/AuthPage.tsx) in login mode; signed-in users redirect to `/` |
| `/signup` | The same persistent [`AuthPage`](../../apps/web/src/pages/auth/AuthPage.tsx) in sign-up mode            |

Shared chrome: [`AuthShell`](../../apps/web/src/components/auth/AuthShell.tsx) + [`AuthPanel`](../../apps/web/src/components/auth/AuthPanel.tsx).

- Full viewport 56/44 split (no inset card). The theme-aware brand area is left and the form is right from `lg` up, both flush to the edges. Below `lg`, the brand area is hidden.
- Canvas: a seamless light or dark tonal background across both columns, with concise product copy and a slow ice-blue waveform inspired by bill and spending flows. The line field continues quietly behind the form, and reduced motion keeps it static.
- Mobile contrast: place a light theme-aware backdrop blur and scrim between the waveform and the form. The artwork remains visible but cannot compete with labels, fields, or actions.
- Separation: use spacing and tonal falloff, not a hard vertical rule.
- Motion: use a calm stagger on the first route entry. Login/sign-up navigation keeps the shell, tabs, social action, email, password, submit action, and footer mounted. The optional name field uses a short opacity/position transition while the remaining fields move with layout transforms; never animate `height: auto`. Respect reduced-motion preferences.
- Geist carries all auth typography. Ice blue `#DAEFFA` is the only brand accent; surfaces and hierarchy stay charcoal and flat.
- Header: the Finance mark sits at the far left inside the desktop brand area. It moves to the top-left of the form column only when the brand area is hidden on smaller screens.
- Form order: compact `Log in` / `Sign up` route switch, title, full-width Google GIS button, “or continue with email”, credential fields, then the solid-primary Continue action.
- Google: use the official GIS renderer and its supported theme, rectangular shape, left-logo alignment, text, and width options. Do not add a wrapper library or a fake custom button; neither can initiate the current GIS ID-token flow more reliably.
- Footer: anchor copyright to the bottom-right of the form column.
- Fields: use the standard shadcn structure with visible labels above each control. Keep auth-specific focus treatment local to the auth components: neutral foreground rings in both themes, never the brand-primary blue. Place one concise validation message below the related field.
- Password: [`AuthPasswordField`](../../apps/web/src/components/auth/AuthPasswordField.tsx) with show/hide.
- Validation: `useForm` + zod. Login: email + required password. Signup: name, email, password min 8. Field errors via `FieldError`; API `detail` is a form-level error.

## Fields

- Login: email, password
- Signup: name, email, password (matches `RegisterRequest`; no confirm-password)

## Status

Wired to the API. `src/api/auth/auth.ts` + `src/hooks/auth/use-auth.ts`. Session via `GET /users/me` (refresh cookie on 401). Google GIS posts `{ id_token }` to `POST /auth/google`.
