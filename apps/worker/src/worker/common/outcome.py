from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class Outcome:
    kind: Literal["ready", "retry", "failed"]
    reason: str | None = None
    warning: str | None = None

    @staticmethod
    def ready(warning: str | None = None) -> "Outcome":
        return Outcome(kind="ready", warning=warning)

    @staticmethod
    def retry(reason: str) -> "Outcome":
        return Outcome(kind="retry", reason=reason)

    @staticmethod
    def failed(reason: str) -> "Outcome":
        return Outcome(kind="failed", reason=reason)
