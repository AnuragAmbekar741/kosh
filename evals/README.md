# evals

Dev-only quality suites for Kosh. Never deployed; a uv workspace member so it can import `api`, `ai` and `storage` directly.

| Suite | Run | What it measures |
|---|---|---|
| `evals.agent` | `make evals` | The chat agent against a real model on a synthetic ledger |

How the agent suite works, the case format and the gates: [docs/architecture/agent.md §11](../docs/architecture/agent.md#11-evals). Results land in `evals/results/` (gitignored).
