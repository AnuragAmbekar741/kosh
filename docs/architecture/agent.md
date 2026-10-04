# Agent — v1 architecture

How the chat agent works inside Kosh. Decisions behind it: rows 52–57 in [decisions.md](./decisions.md). Build order: [product/agent-plan.md](../product/agent-plan.md). Nothing here is built yet; update this file as phases land.

## 1. Principle

The agent is **one more client of the services the dashboard uses**, not a second backend.

```
Agent → tool → modules/<f>/service.py → storage.crud → Postgres
```

It never runs SQL, never sees `user_id`, has no tools that reach outside Kosh, and cannot change data without a confirmed pending action.

## 2. Components

```
apps/web  ── chat page ── fetch + ReadableStream (SSE) ──┐
                                                         ▼
apps/api
  modules/agent/
    router.py     conversations, messages (SSE), actions confirm/cancel
    runtime.py    the tool loop: model ⇄ tools, ≤ 6 steps per turn
    tools.py      TOOLS: name → (args model, risk, handler)
    prompt.py     system prompt + PROMPT_VERSION
  modules/spend, modules/documents      services the tools call
packages/ai      chat-with-tools call to OpenRouter (same openai client as extraction)
packages/storage models/agent.py + crud/agent.py
apps/worker      unchanged; extracts chat attachments like any upload
```

WhatsApp (later) is another router in `apps/api` that resolves the sender to a user and calls the same runtime.

## 3. Identity and authentication

The agent has **no identity of its own**. Every turn runs as the user who sent it.

| Channel | How the user is known |
|---|---|
| Web | `Authorization: Bearer <access JWT>` → `CurrentUserDep`, same as every route |
| WhatsApp (later) | Meta webhook signature → `channel_accounts.wa_id` → `user_id` |

The runtime builds `ToolContext(user, conversation_id)` and passes it to every tool. Tools read the user from the context; **no tool schema has a `user_id` field**, so the model cannot ask for anyone else's data. Conversations, runs and pending actions are owner-checked like other user rows (wrong owner → 404).

The agent can call only the tools in `TOOLS`. Auth, password, token and account routes are not tools.

If the agent ever moves to its own process, it would get short-lived scoped service tokens (`aud=agent`, scopes per tool). Not needed in-process.

## 4. Serving a message

```
POST /agent/conversations/{id}/messages   {text, document_ids?}
```

1. `CurrentUserDep` → user. Any 401 happens before the stream opens.
2. Conversation owner check → 404 otherwise.
3. Daily budget check on `agent_runs` → 429 when over.
4. Short DB session: insert the user message and a `running` run; commit; close.
5. Open `text/event-stream` and loop, at most 6 steps:
   1. Load the last 20 messages; build `[system, …history]`.
   2. Call OpenRouter with the tool schemas. **No DB connection is held during the call** (Neon connection limits; a call can take seconds).
   3. For each tool call: validate arguments with the tool's Pydantic model, then
      - `read` → run the handler in a short session, append a `tool` message;
      - `write` / `destructive` → insert a pending action (§6), append a `tool` message saying it awaits confirmation.
   4. No tool calls → that text is the reply; stop.
6. Insert the assistant message; finish the run (status, steps, tokens, cost); emit `done`.

SSE events: `tool` (name, for a "looking up…" chip), `delta` (reply text), `action` (pending card), `document` (attachment status), `done` (message and run ids), `error`.

- **Web client:** `fetch` with a ReadableStream, because `EventSource` cannot send `Authorization`. Before streaming it reuses the axios refresh path, so one 401 refreshes and retries. The token is checked only when the stream opens; a reply that outlives the 15-minute token still finishes.
- **Threads:** a sync generator inside `StreamingResponse` holds one worker thread per live turn (default pool 40). Move to async when concurrent chats approach that.
- **Disconnects:** if the browser drops, the loop still finishes and saves; the reply is there on reload.

## 5. Tools

Each entry in `TOOLS`: name, description, Pydantic argument model, `risk` (`read | write | destructive`), handler `(ctx, args) -> dict`. A dict, not a registry class.

| Tool | Risk | Calls | Phase |
|---|---|---|---|
| `get_spending_summary` | read | `spend` summary / analytics | 1 |
| `list_spend_items` | read | `spend` list; `limit` ≤ 50 | 1 |
| `get_spend_item` | read | `spend` get | 1 |
| `list_documents`, `get_document` | read | `documents` list / get (drafts) | 1–2 |
| `confirm_document` | write | `documents` confirm | 2 |
| `update_spend_item` | write | `spend` update | 3 |
| `delete_spend_items` | destructive | `spend` delete; ≤ 50 ids | 3 |

Tool results go back as compact JSON from the existing presenters, trimmed to what the model needs. Totals are computed in SQL; the model quotes them, it does not add them up.

## 6. Pending actions (writes)

The model can only **propose** a write. Confirmation is enforced by code, not by the prompt.

1. The model calls a `write` or `destructive` tool.
2. The runtime validates the arguments and inserts an `agent_pending_actions` row: tool name, exact arguments, a human summary ("Delete 12 Starbucks items · ₹870"), `pending`, `expires_at` = now + 15 min.
3. The model gets `{"status": "pending_confirmation"}` and tells the user to confirm; the UI shows a card from `summary`.
4. `POST /agent/actions/{id}/confirm` checks owner, `pending`, not expired; runs the stored tool with the stored arguments through the same service; records `result`, `confirmed`, `decided_at`; appends a templated assistant message. **No model call.**
5. `POST /agent/actions/{id}/cancel` → `cancelled`. Unanswered → `expired`. Nothing changes.

What the user approves is exactly what runs, an injected instruction can at most produce a card the user cancels, and the card survives reloads (on WhatsApp it becomes reply buttons).

## 7. Attachments

Chat images use the documents pipeline only:

1. The web uploads with `POST /documents` (`source=agent`), gets `document_id`s, and sends them with the message.
2. The turn waits for the worker (status polled from the DB every second, up to ~60 s), emitting `document` events.
3. Ready → the model reads the drafts with `get_document` and proposes `confirm_document`. Timeout → a templated "still reading your receipt" reply with no model call.

The agent model never sees the image, so it can stay text-only and cheap.

## 8. Security

| Risk | Defence |
|---|---|
| Write without consent | Pending actions (§6); only the confirm endpoint executes |
| Prompt injection (text on a receipt, in a merchant name) | Tool results and extracted text are data; the worst outcome is a card the user cancels |
| Data leaving Kosh | No outbound tools: no web fetch, email, or links rendered from tool data |
| Another user's data | `user_id` only from `ToolContext`; every crud call scoped by it; owner checks on agent rows |
| Bulk damage | Write tools cap ids at 50; the card shows count and total |
| Runaway cost | 6 steps per turn, 800 output tokens per step, daily runs per user, list limits |
| Logs | Ids only, never message content (row 39); transcripts live in the DB as user data |
| Model provider retention | OpenRouter zero-data-retention routing for the agent model |
| Out of scope requests | System prompt declines investment advice and anything outside the user's own ledger |

## 9. Cost

| Control | Start |
|---|---|
| Model | `OPENROUTER_AGENT_MODEL`, defaults to the extraction model |
| Steps per turn | 6 |
| Output tokens per step | 800 |
| History | last 20 messages, tool results trimmed |
| Daily cap | `AGENT_DAILY_RUNS` = 50 per user |
| Confirm, timeouts, titles | no model call |

Every run records tokens and cost, so spend per user per day is one query on `agent_runs`.

## 10. Deployment (open)

Postgres and blobs stay on Neon. Three processes need a host: the static web build, the API (long SSE responses), and the always-on worker. Scale-to-zero serverless fits the last two poorly.

| | A. One VM + Docker Compose | B. PaaS (Render / Railway / Fly.io) |
|---|---|---|
| Runs | Caddy (TLS, static web, proxy) + api + worker | web service + worker + static site |
| Cost | ~$5–7 / month | ~$15–25 / month |
| Visible | everything | dashboards |
| You own | OS updates, firewall | little |
| Deploy | Actions → GHCR → SSH `docker compose pull && up -d`; migrations as a one-off container first | push or image deploy; migration as pre-deploy |

Leaning A (cheapest, nothing hidden). Either way: secrets in host env, `LOG_FORMAT=json`, `/health` checks, proxy buffering off for SSE.
