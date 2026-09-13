from uuid import UUID

from ai import ExtractMeta
from ai.settings import get_settings as get_ai_settings
from sqlmodel import Session
from storage.crud.document import create_extraction_attempt, next_attempt_no
from storage.models.document import ExtractionAttempt


def write_error(session: Session, document_id: UUID, error: str) -> None:
    create_extraction_attempt(
        session,
        ExtractionAttempt(
            document_id=document_id,
            attempt_no=next_attempt_no(session, document_id),
            model=get_ai_settings().openrouter_model,
            error=error,
        ),
        commit=False,
    )


def write_success(
    session: Session,
    document_id: UUID,
    *,
    meta: ExtractMeta,
    payload: dict,
    warning: str | None,
):
    return create_extraction_attempt(
        session,
        ExtractionAttempt(
            document_id=document_id,
            attempt_no=next_attempt_no(session, document_id),
            model=meta.model,
            provider=meta.provider,
            payload=payload,
            prompt_tokens=meta.prompt_tokens,
            completion_tokens=meta.completion_tokens,
            error=warning,
        ),
        commit=False,
    )
