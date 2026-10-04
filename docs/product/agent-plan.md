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

## Phase 1 checklist

- [ ] `DocumentSource.AGENT` and agent `StrEnum`s; `models/agent.py`, `crud/agent.py`; `alembic revision --autogenerate`
- [ ] `packages/ai`: chat-with-tools call returning tool calls, text, tokens, cost; `OPENROUTER_AGENT_MODEL`
- [ ] `modules/agent/`: `tools.py`, `prompt.py`, `runtime.py`, `router.py`
- [ ] Tests: owner checks, budget 429, `user_id` absent from every tool schema, no DB session across the model call (fake model)
- [ ] `apps/api/evals/` runner + first golden cases; `make evals`
- [ ] Web: `src/api/agent/`, `src/hooks/agent/`, chat page with streaming
- [ ] Docs: overview, scope, design page for chat

## Open

- **Deployment:** one VM with Docker Compose + Caddy (leaning) or a PaaS. See [architecture/agent.md §12](../architecture/agent.md#12-deployment-open). Not needed until phase 1 runs locally.
