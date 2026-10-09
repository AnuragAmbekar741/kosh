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
| **6. Evals** | `evals/` workspace package (`evals.agent`), 20 golden + 6 safety cases, `make evals` | The runner itself, on a scripted model; ledger totals vs the real summary tool | this PR |
| **7. Web chat** | `src/api/agent/`, `src/hooks/agent/`, chat page with `fetch` streaming; `docs/design/agent.md` | Manual run against the local API | |

`DocumentSource.AGENT` moves to phase 2 with attachments.

## Open

- **Concurrency ceiling:** each streaming reply holds one of FastAPI's 40 shared threads; past about 40 live chats every route slows (measured: `/health` 0.01 s → 1.8 s at 60 chats). Planned fix: async stream + global cap on live replies. See [architecture/agent.md §13](../architecture/agent.md#13-concurrency-limits-known-not-fixed-yet). Do before real traffic.
- **Deployment:** one VM with Docker Compose + Caddy (leaning) or a PaaS. See [architecture/agent.md §12](../architecture/agent.md#12-deployment-open). Not needed until phase 1 runs locally.
