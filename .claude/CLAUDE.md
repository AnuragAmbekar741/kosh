Read [AGENTS.md](../AGENTS.md) first; it links the rest of the project rules.

# Commits when raising a PR

- Split the work into several meaningful commits, one logical step each (for example: storage, service, endpoint, tests, docs), not one commit for the whole PR. Each commit should build and pass tests on its own.
- Keep messages short: a conventional prefix (`feat`, `fix`, `docs`, `test`, `refactor`, `chore`) with a scope, and an imperative subject of at most about 50 characters, e.g. `feat(agent): offer to save a bill`. Add a body only when the why isn't obvious, and keep it to a line or two.
- Keep unrelated changes, such as formatter runs over untouched files, out of the commits.
- Before opening the PR, check that `git log --oneline main..HEAD` reads as a clear sequence of steps.
