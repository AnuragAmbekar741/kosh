# Agent — build plan

Status: **decisions and architecture locked** (rows 52–61 in [decisions.md](../architecture/decisions.md), design in [architecture/agent.md](../architecture/agent.md)); **deployment open**; no code yet. As phases land, update `architecture/agent.md`, `architecture/overview.md` and `product/scope.md`, and delete this file when done.

## Phases

| Phase | Delivers | Done when |
|---|---|---|
| **1. Read-only chat** | `agent_conversations`, `agent_messages`, `agent_runs` + migration; conversation and message endpoints with SSE; read tools; daily budget; web chat page; `make evals` with ~20 golden cases | "How much did I spend on groceries last month?" answers from the DB; golden ≥ 90% |
| **2. Attachments** | Upload in chat (`source=agent`); wait-for-extraction; `agent_pending_actions`; `confirm_document` with confirm / cancel endpoints and the card | Receipt photo → drafts shown → card → confirmed bill on Spending |
| **3. Writes** | `update_spend_item`, `delete_spend_items` (≤ 50); expiry; ~10 safety cases | Safety 100%: injected receipts and "delete everything" never change data without a click |
| **4. Learning loop** | 👍 / 👎 on replies; review list of failed runs; per-user preferences in context | A reviewed failure becomes a failing case, then a passing one |
| **5. WhatsApp** | Webhook router; `channel_accounts`; buttons as confirm cards | Same runtime, new transport |

## Phase 1 pull requests

Each PR merges on its own and leaves `main` working; the API is not reachable until PR 5 and there is no UI until PR 7.

| PR | Scope | Tests | Status |
|---|---|---|---|
| **1. Storage** | `models/agent.py` (conversations, messages, runs), `crud/agent.py`, migration | Owner scoping, turn + title, chat-shape round trip, history cut by turns, `seq` unique, daily run count | merged (#37) |
| **2. Model call** | `packages/ai`: `chat_with_tools(messages, tools)` → text, tool calls, tokens, cost; `OPENROUTER_AGENT_MODEL` | Fake OpenAI client: parsing, usage, retryable errors; one live `llm` round trip | merged (#38) |
| **3. Tools + prompt** | read tools over spend and documents services, system prompt with `PROMPT_VERSION` (now `core/tools/`, `core/prompts/`) | Every tool scoped to `ctx.user`; no schema has `user_id`; bad arguments rejected; `limit` ≤ 50 | merged (#40) |
| **4. Runtime** | `core/runtime.py`: the loop, step cap, saving messages and the run, event stream | Fake model: tool round trip, 6-step cap, failed run saved, no DB session open during the model call | merged (#41) |
| **5. Endpoints** | `router.py`: create / list conversations, transcript, `POST …/messages` as SSE; `AGENT_DAILY_RUNS` → 429 | Auth 401, owner 404, busy 409, budget 429, unconfigured 503, SSE event order, reply finishes after disconnect | merged (#42) |
| **6. Evals** | `evals/` workspace package (`evals.agent`), 20 golden + 6 safety cases, `make evals` | The runner itself, on a scripted model; ledger totals vs the real summary tool | merged (#43) |
| **7. Web chat** | `src/api/agent/`, `src/hooks/agent/`, floating chat widget with `fetch` streaming; `docs/design/agent.md` | Manual run against a throwaway local API: desktop, phone, light and dark | this PR |

`DocumentSource.AGENT` moves to phase 2 with attachments.

## Phone UI (agreed, not built)

Below 768px (`useIsMobile`), the app becomes chat-first. Desktop does not change. When this ships, move this section into a `docs/design/mobile.md` and link it from `design/README.md`.

| Area | Agreed |
|---|---|
| **Shell** | No sidebar and no floating launcher. One floating nav button opens a Stack menu with **Scan a bill**, **Chat** (`/chat`, the phone home), **Bills** (`/spending/bills`), **Insights** (`/spending/analytics`) and **You** (account, theme, sign out); it replaced the first bottom tab bar (see [Phone redesign](#phone-redesign-floating-nav-chat-depth-compact-toolbars)). Items is reached from inside Bills. Overview is not a tab; the chat summary card replaces it. On desktop, `/chat` redirects to `/overview` with the panel open. |
| **Chat header** | "Kosh", then history (the past chats list; new chat lives there) and the notification bell. |
| **Summary card** | At the top of an empty thread: month-to-date total, bill count, and "N to review" when extracted bills are waiting. Tapping it opens this month's Bills; review stays in the bell. Its contents are fixed for now; letting users customise it is deferred. |
| **Composer** | A frosted pill: text, a paperclip for photos and PDFs (`multiple`, same 5-file cap as upload), and a round send button. The camera (`accept="image/*" capture="environment"`) is **Scan a bill** in the nav menu, which sits beside the composer. Text sent along with photos is a note on the bill. The three example questions show as chips above the composer while the thread is empty. |
| **Photos** | Shrunk in the browser to a 2000px long edge as JPEG before upload. PDFs, and files the browser can't decode (HEIC outside Safari), are uploaded untouched. |
| **In the thread** | The user bubble shows page thumbnails. Then a status line ("Reading your bill…", with the page count) and a note that the bell will say when it's ready. Leaving the screen is fine. |
| **Confirm card** | Merchant, date, lines, tax, total and any duplicate warning. Actions: **Save bill** (primary), **Edit** (opens the existing review as a full-screen sheet), and discard. Nothing is saved without a tap. |
| **Scan from any tab** | **Scan a bill** is the first item in the nav menu on every phone page. After a photo is taken, it switches to Chat with the upload in the thread. |
| **Phone details** | `100dvh`, `env(safe-area-inset-bottom)` under the nav button and composer, `interactive-widget=resizes-content` so the composer sits above the keyboard, 44px touch targets (already the mobile control size), toasts top-center. |

### Phone redesign: floating nav, chat depth, compact toolbars

Approved from an HTML prototype on 2026-10-16 (the **Stack** menu; the Card menu was rejected). One PR, `apps/web` only: no backend, API, hook data flow or storage changes. "Phone" means below 768px (`useIsMobile`); every change sits behind it, and desktop renders exactly as before.

#### 1. Floating nav (replaces `PhoneTabBar` and `PhoneScanButton`)

| | |
|---|---|
| **Files** | New `components/layout/navigation/PhoneNav.tsx` (button, Stack menu, scan input, You sheet). `AppShell.tsx` drops `PhoneTabBar` and `PhoneScanButton` (both deleted) and renders the floating `PhoneNav` everywhere except `/chat`. `pages/chat/ChatPage.tsx` puts `PhoneNav` inline in the composer row (floating while Past chats shows, since that view has no composer). `--phone-tab-bar` leaves `index.css`, `DashboardSkeleton.tsx` and the scan button. `ui/button.tsx` gains `icon-fab` (48px, `rounded-2xl`). |
| **Button** | 48px, `rounded-2xl`, `bg-primary`, `--glass-shadow-lg`. Grid icon, X while open (rotates 90°). Floating: `fixed`, 16px from the right, `16px + env(safe-area-inset-bottom)` from the bottom, `z-30` closed (under dialogs and sheets) and `z-[60]` open (over its own scrim). Inline on Chat: the first item of the composer row. Badge: bills waiting for review (`useDocumentInbox`, `ready` and `needs_review`, the bell's query, read only), 18px, top-right, `background` fill with a `primary` ring; the button's label then reads "Menu, 2 bills to review". |
| **Menu** | Base UI `Popover` (already a dependency through `ui/popover`): `Backdrop` is the scrim (`--scrim` plus `backdrop-blur-sm`; a tap closes), Esc closes, focus moves to the first item on open and returns to the button on close, and the trigger gets `aria-expanded` and `aria-haspopup="dialog"` for free. Positioned `side="top"`, 12px above the button, aligned to its outer edge (`end` when floating right, `start` on Chat). Inside, a `<nav aria-label="Main">` list from the top: **Scan a bill** (camera, 48px tile), **Chat**, **Bills** (also current on `/spending/items`), **Insights**, **You**. Each row is a real `Link` (`aria-current="page"` on the current one) or a `button` (Scan, You): a 44px frosted tile (`--glass-strong`, `--glass-border`, `--glass-shadow`, `rounded-[14px]`) with the icon, and a frosted label pill beside it on the inner side (left of the tile when the button is on the right; right of it on Chat via `flex-row-reverse`). The whole row is the touch target (≥44px). The current page's tile is `bg-primary text-primary-foreground`. |
| **Motion** | Rows rise 12px and fade in from the bottom up, 30ms apart (bottom row first), 220ms `cubic-bezier(.2,.8,.2,1)`, using Base UI's `data-starting-style` / `data-ending-style`. Under `prefers-reduced-motion`, no transitions or stagger; the menu just appears. |
| **Scan** | The camera `<input capture="environment">` lives in `PhoneNav` (outside the popup, so it survives the menu closing). Scan closes the menu, clicks the input in the same tap (iOS needs the user gesture), sends the files with `useChatScans().add`, and goes to `/chat` when not already there: the same behaviour as the old `PhoneScanButton`. |
| **You** | Closes the menu and opens the existing `PhoneAccountSheet` (unchanged). |
| **Composer buttons** | The camera and gallery pair in the composer goes. The camera is **Scan a bill** in the menu, one tap away beside the composer; the gallery becomes a ghost paperclip **Add photos** button inside the pill (up to 5 images or PDFs). `AgentScanButtons` becomes `AgentAttachButton`. |
| **Safe areas** | No reserved bar. The floating button sits above `env(safe-area-inset-bottom)`; on Chat the composer row pads `0.75rem + env(safe-area-inset-bottom)`. Bills, Items and Insights scroll areas pad their bottom by `--phone-nav-clearance` (`5rem + env(safe-area-inset-bottom)`) so the last row and the Items pager clear the button. |
| **Desktop** | Untouched: sidebar, header, floating assistant launcher. `PhoneNav` never renders at 768px and up. |

#### 2. Chat depth (`/chat` on phones)

| | |
|---|---|
| **Files** | New `components/agent/ChatBackdrop.tsx` (reusable: the desktop panel can mount it later). `ChatPage.tsx` mounts it behind the content (`relative isolate`, backdrop `absolute inset-0 -z-10 pointer-events-none`, `aria-hidden`). `index.css`: glass tokens and a `glass` utility, `rise` and `float` keyframes. `AgentSummaryCard.tsx`, `AgentHome.tsx`, `AgentComposer.tsx` take the glass look on phones only. |
| **Backdrop** | `--empty-wash` (the slate mist), the login waveform (`visuals/ContourField`, reused as is: same drift, which already stops under reduced motion), masked by a radial ellipse so it fades at every edge, and a soft radial glow (`color-mix` of `foreground` at 7%) in the middle that breathes slowly (`motion-safe` only). Slate only; no colour. |
| **Glass** | `--glass` (translucent `card`), `backdrop-blur-[18px] saturate-120`, 1px `--glass-border` hairline, `--glass-shadow`. Light: white at 62%, slate hairline at 8%. Dark: `#141516` at 55%, white hairline at 8%. Applied to the summary card (`rounded-2xl`), the chips, the hero icon tile and the composer pill. |
| **Hero** | Between the summary card and the chips, centred: a 52px frosted icon tile (sparkles), mono uppercase eyebrow "Your spending assistant", title "Ask about your spending", and "Answers come from your confirmed bills. Nothing is changed from chat." |
| **Chips** | Full-width stacked rows, 14px radius, a small leading icon (calendar, chart, receipt), left-aligned text. They rise in 80ms apart, then float 3px over 8s, offset per chip. Both `motion-safe` only. |
| **Composer** | Phone variant (`AgentComposer variant="phone"`): row = nav button + frosted pill (`rounded-[22px]`, min 48px) holding the textarea, the paperclip, and a 36px round send button. Desktop keeps the current bordered composer (`variant="panel"`, the default). |
| **Desktop** | The agent panel keeps its current look. `ChatBackdrop` and the `glass` utility are shared pieces it can opt into later. |

#### 3. Compact Bills and Insights toolbars (phones only)

| | |
|---|---|
| **Files** | `ui/button.tsx` (`icon-dense` 36px, `icon-dense-sm` 32px: fixed sizes for phone toolbars), `ui/input-group.tsx` (`size="dense"`, 36px), `ui/toggle.tsx` (`dense`, 36px). `AddSpendingDialog.tsx`, `SpendingToolbar.tsx`, `FilterMenu.tsx`. `docs/design/global.md` Control sizes gets the Dense row. |
| **Add spending** | On phones the header trigger is a 32px icon-only "+" (`icon-dense-sm`, `aria-label="Add spending"`). Desktop keeps the text button. |
| **Bills** | Row 1: 36px search field (`flex-1`) and a 36px outline Filters icon button (opens the existing bottom sheet), with a dot when any filter is on and an accessible name like "Filters, 2 on". Row 2, only when there is something to show: active filters as 26px dismissible chips (date, each category, source; tapping one clears it, `aria-label="Remove … filter"`), scrolling sideways if long, and the count ("18 bills") right-aligned in muted text. |
| **Insights** | Row 1: a compact period switch on the left (`ToggleGroup` with **Month**, **3 mo**, **Year**, **All**, wired to the existing date filter presets `this-month`, `last-3-months`, `this-year`, `all`) and the Filters icon button on the right. Row 2 as on Bills; the date chip only shows for a date the switch can't show (last month, a custom range). |
| **Desktop** | `SpendingToolbar` keeps its desktop branch byte for byte: Filters dropdown, count badge, 256px search. |

#### Accessibility

- Nav button: `aria-label` (with the review count), `aria-expanded`, `aria-haspopup`; 48px. Menu rows ≥44px, real links with `aria-current="page"`, or buttons. Focus in on open, back on close, Esc and scrim tap close. The scrim and backdrop are `aria-hidden`.
- Chat backdrop is decorative (`aria-hidden`, `pointer-events-none`). Glass keeps text contrast: `foreground` text on a ≥55% opaque surface.
- Toolbar: the Filters icon button and "+" have names; filter chips are buttons named "Remove {filter} filter"; the period switch is a labelled `ToggleGroup` ("Period").
- Reduced motion: no menu stagger, chip rise or float, glow breathing or waveform drift.

#### Checks

- `pnpm run typecheck`; `pnpm run lint` clean apart from the known `ui/badge.tsx` react-refresh error.
- In-app browser at 375×812, light and dark, signed in against a throwaway local SQLite API with a seeded user:
  - [x] Nav opens and closes (button, scrim, Esc); focus moves in and back; each target: Scan (camera input opens; file → `/chat` with the scan), Chat, Bills, Insights, You (sheet). Current tile filled; Bills current on Items. Badge shows the review count.
  - [x] On Chat the button sits left of the composer and the menu rises from it with labels on the right; on Bills and Insights it floats bottom-right with labels on the left. No overlap with the composer, last rows or the Items pager.
  - [x] Chat backdrop drifts behind the mist; summary card, hero, chips and composer are frosted in both themes.
  - [ ] Reduced motion stops all movement (every animation is behind `motion-safe` / `motion-reduce` or `useReducedMotion`; not yet checked with the OS setting on).
  - [x] Bills: "+" header button, 36px search and Filters, dot when filtered, chips clear filters, count right-aligned. Insights: period switch changes the date filter.
  - [x] Desktop (1024px): sidebar, header Add spending text button, Filters dropdown, assistant launcher and panel all unchanged.

## Phone + attachments pull requests

11 PRs in five stages. Each one merges on its own and leaves `main` working. Snapping a bill from the phone works after **PR 5**. The confirm card in chat arrives with **PR 10**.

| PR | Stage | Scope | Tests | Status |
|---|---|---|---|---|
| **1. Phone dev setup** | A. Test on phone | `pnpm dev:phone` (`vite --host`), `server.allowedHosts` for `.ts.net`, viewport `interactive-widget=resizes-content`; docs for LAN and Tailscale testing (email login on LAN, `cookie_secure` off for http) | App opens on a real phone over LAN and over Tailscale HTTPS | merged (#55) |
| **2. Phone shell** | B. Phone UI | `AppShell` below 768px: no sidebar or launcher, bottom tabs (Chat, Bills, Insights, You), safe areas, `100dvh`; You tab with account, theme, sign out | Browser 375px light and dark; desktop unchanged | merged (#56) |
| **3. Chat page** | B | `/chat` full screen, reusing the agent thread and composer; header with history and bell; summary card (month total, bills, needs review); example chips; desktop `/chat` → `/overview` with the panel open | Same chat as the widget; card numbers match Overview and Bills | merged (#58) |
| **4. Bills and Insights on phone** | B | Bill rows as stacked rows, filters in a bottom sheet, review dialog as a full-screen sheet, charts at phone width | 375px pass over every Spending state | merged (#59) |
| **5. Scan from phone** | C. Capture | Composer camera and gallery, browser-side shrinking (2000px JPEG), upload through `POST /documents`, thumbnails and progress in the thread, **Review** link into the review sheet; floating scan button on Bills and Insights | Real phone: camera → bill in review → saved | merged (#60) |
| **5b. Phone redesign** | B | Floating nav with a Stack menu (absorbs the tab bar and scan button), chat waveform depth and frosted glass, compact Bills and Insights toolbars. UI only. Plan: [Phone redesign](#phone-redesign-floating-nav-chat-depth-compact-toolbars) | Browser 375×812 light and dark; desktop unchanged | this PR |
| **6. Storage** | D. Agent phase 2 (backend) | `DocumentSource.AGENT`, `agent_pending_actions` model, crud, migration | Owner scoping, status changes, expiry query | |
| **7. Attachments in a turn** | D | `document_ids` on `POST …/messages`, ownership check, wait for the worker (1s poll, about 60s), `document` SSE events, templated timeout reply with no model call | Fake worker: ready, failed, timeout; someone else's document → 404 | |
| **8. Pending actions** | D | `confirm_document` write tool → pending row; `POST /agent/actions/{id}/confirm` and `/cancel`; expiry; templated message on confirm | Confirm runs the stored arguments only; expired, cancelled, wrong owner | |
| **9. Evals** | D | Attachment golden cases and safety cases (a receipt with injected instructions, "save everything") | Golden ≥ 90%, safety 100% | |
| **10. Confirm card** | E. Chat flow | Web sends `document_ids`, renders `document` and `action` events; card with Save bill, Edit, Discard; card survives reload; PR 5's Review link becomes this flow | Real phone: snap → card → Save → bill on Bills | |
| **11. Installable app** | E | Web app manifest, icons, `theme-color`, minimal service worker (no offline) | Add to Home Screen over Tailscale; opens full screen | |

Order: PRs 1–5 go one after another (all in `apps/web`). PRs 6–9 are backend only and can run in parallel with 2–5. PR 10 needs 5 and 8. PR 11 can land any time after 2.

## Open

- **Concurrency ceiling:** each streaming reply holds one of FastAPI's 40 shared threads; past about 40 live chats every route slows (measured: `/health` 0.01 s → 1.8 s at 60 chats). Planned fix: async stream + global cap on live replies. See [architecture/agent.md §13](../architecture/agent.md#13-concurrency-limits-known-not-fixed-yet). Do before real traffic.
- **Deployment:** one VM with Docker Compose + Caddy (leaning) or a PaaS. See [architecture/agent.md §12](../architecture/agent.md#12-deployment-open). Not needed until phase 1 runs locally.
