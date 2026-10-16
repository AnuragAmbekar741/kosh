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
| **Shell** | No sidebar and no floating launcher. A bottom tab bar holds **Chat** (`/chat`, the phone home), **Bills** (`/spending/bills`), **Insights** (`/spending/analytics`) and **You** (account, theme, sign out). Items is reached from inside Bills. Overview is not a tab; the chat summary card replaces it. On desktop, `/chat` redirects to `/overview` with the panel open. |
| **Chat header** | "Kosh", then history (the past chats list; new chat lives there) and the notification bell. |
| **Summary card** | At the top of an empty thread: month-to-date total, bill count, and "N to review" when extracted bills are waiting. Tapping it opens this month's Bills; review stays in the bell. Its contents are fixed for now; letting users customise it is deferred. |
| **Composer** | Camera (`accept="image/*" capture="environment"`), gallery (`multiple`, same 5-file cap as upload), text, send. Text sent along with photos is a note on the bill. The three example questions show as chips above the composer while the thread is empty. |
| **Photos** | Shrunk in the browser to a 2000px long edge as JPEG before upload. PDFs, and files the browser can't decode (HEIC outside Safari), are uploaded untouched. |
| **In the thread** | The user bubble shows page thumbnails. Then a status line ("Reading your bill…", with the page count) and a note that the bell will say when it's ready. Leaving the screen is fine. |
| **Confirm card** | Merchant, date, lines, tax, total and any duplicate warning. Actions: **Save bill** (primary), **Edit** (opens the existing review as a full-screen sheet), and discard. Nothing is saved without a tap. |
| **Scan from any tab** | Bills and Insights get a floating camera button above the tab bar. After a photo is taken, it switches to Chat with the upload in the thread. |
| **Phone details** | `100dvh`, `env(safe-area-inset-bottom)` under the tab bar, `interactive-widget=resizes-content` so the composer sits above the keyboard, 44px touch targets (already the mobile control size), toasts top-center. |

## Phone + attachments pull requests

11 PRs in five stages. Each one merges on its own and leaves `main` working. Snapping a bill from the phone works after **PR 5**. The confirm card in chat arrives with **PR 10**.

| PR | Stage | Scope | Tests | Status |
|---|---|---|---|---|
| **1. Phone dev setup** | A. Test on phone | `pnpm dev:phone` (`vite --host`), `server.allowedHosts` for `.ts.net`, viewport `interactive-widget=resizes-content`; docs for LAN and Tailscale testing (email login on LAN, `cookie_secure` off for http) | App opens on a real phone over LAN and over Tailscale HTTPS | merged (#55) |
| **2. Phone shell** | B. Phone UI | `AppShell` below 768px: no sidebar or launcher, bottom tabs (Chat, Bills, Insights, You), safe areas, `100dvh`; You tab with account, theme, sign out | Browser 375px light and dark; desktop unchanged | merged (#56) |
| **3. Chat page** | B | `/chat` full screen, reusing the agent thread and composer; header with history and bell; summary card (month total, bills, needs review); example chips; desktop `/chat` → `/overview` with the panel open | Same chat as the widget; card numbers match Overview and Bills | this PR |
| **4. Bills and Insights on phone** | B | Bill rows as stacked rows, filters in a bottom sheet, review dialog as a full-screen sheet, charts at phone width | 375px pass over every Spending state | |
| **5. Scan from phone** | C. Capture | Composer camera and gallery, browser-side shrinking (2000px JPEG), upload through `POST /documents`, thumbnails and progress in the thread, **Review** link into the review sheet; floating scan button on Bills and Insights | Real phone: camera → bill in review → saved | |
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
