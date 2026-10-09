"""The agent's prompts, kept as Markdown next to the tools they describe.

Bump PROMPT_VERSION on every wording change; each run records it, so an
answer and an eval result can always be traced to the exact text.
"""

from datetime import date
from pathlib import Path

__all__ = ["PROMPT_VERSION", "system_prompt"]

PROMPT_VERSION = "1"

_SYSTEM = (Path(__file__).parent / "system.md").read_text(encoding="utf-8").strip()


def system_prompt(today: date) -> str:
    return f"Today is {today:%A}, {today.isoformat()}.\n\n{_SYSTEM}"
