import hashlib
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile, status
from security import CurrentUserDep
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session
from storage.blobs import BlobError
from storage.crud.document import (
    get_document,
    hash_matches_other,
    latest_attempt,
    list_documents,
)
from storage.crud.spend import confirm_document_items, list_document_spend_items
from storage.database import get_session
from storage.models.document import Document, DocumentStatus
from storage.models.spend import SpendStatus
from storage.settings import get_settings as get_storage_settings

from api.documents import (
    FileTooLargeError,
    IdempotencyConflictError,
    UnsupportedFileError,
    store_upload,
)
from api.routers.spend import _public as spend_public
from api.schemas.documents import (
    ConfirmDocumentRequest,
    DocumentDetail,
    DocumentSummary,
    DocumentUploadResponse,
)
from api.schemas.spend import SpendItemPublic

router = APIRouter(prefix="/documents", tags=["documents"])
SessionDep = Annotated[Session, Depends(get_session)]


def _summary(document: Document) -> DocumentSummary:
    return DocumentSummary(
        id=document.id,
        filename=document.filename,
        mime_type=document.mime_type,
        size_bytes=document.size_bytes,
        status=document.status,
        source=document.source,
        error=document.error,
        created_at=document.created_at,
        processed_at=document.processed_at,
    )


def _detail(session: Session, user_id: UUID, document: Document) -> DocumentDetail:
    attempt = latest_attempt(session, document.id)
    drafts = list_document_spend_items(
        session,
        user_id=user_id,
        document_id=document.id,
        status=SpendStatus.PENDING_REVIEW,
    )
    return DocumentDetail(
        **_summary(document).model_dump(),
        content_hash=document.content_hash,
        hash_matches_existing=hash_matches_other(
            session,
            user_id=user_id,
            content_hash=document.content_hash,
            document_id=document.id,
        ),
        extraction=attempt.payload if attempt is not None else None,
        drafts=[spend_public(item) for item in drafts],
    )


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def upload(
    user: CurrentUserDep,
    session: SessionDep,
    file: Annotated[UploadFile, File()],
    idempotency_key: Annotated[
        str | None, Header(alias="Idempotency-Key", max_length=200)
    ] = None,
) -> DocumentUploadResponse:
    max_bytes = get_storage_settings().max_upload_mb * 1024 * 1024
    data = await file.read(max_bytes + 1)
    key = idempotency_key.strip() if idempotency_key else None
    if key == "":
        key = None
    try:
        document = store_upload(
            session,
            user_id=user.id,
            filename=file.filename or "upload",
            data=data,
            idempotency_key=key,
        )
    except UnsupportedFileError:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="unsupported file type",
        ) from None
    except FileTooLargeError:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="file exceeds upload limit",
        ) from None
    except IdempotencyConflictError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="idempotency key was already used for different content",
        ) from None
    except BlobError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="storage write failed",
        ) from None
    except IntegrityError:
        session.rollback()
        if key:
            from storage.crud.document import get_document_by_idempotency

            existing = get_document_by_idempotency(
                session, user_id=user.id, idempotency_key=key
            )
            if existing is not None:
                if existing.content_hash != hashlib.sha256(data).hexdigest():
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="idempotency key was already used for different content",
                    ) from None
                return DocumentUploadResponse(id=existing.id, status=existing.status)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="duplicate upload"
        ) from None
    return DocumentUploadResponse(id=document.id, status=document.status)


@router.get("")
def list_docs(user: CurrentUserDep, session: SessionDep) -> list[DocumentSummary]:
    return [_summary(document) for document in list_documents(session, user_id=user.id)]


@router.get("/{document_id}")
def get_doc(
    document_id: UUID, user: CurrentUserDep, session: SessionDep
) -> DocumentDetail:
    document = get_document(session, user_id=user.id, document_id=document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return _detail(session, user.id, document)


@router.post("/{document_id}/confirm")
def confirm(
    document_id: UUID,
    body: ConfirmDocumentRequest,
    user: CurrentUserDep,
    session: SessionDep,
) -> list[SpendItemPublic]:
    document = get_document(session, user_id=user.id, document_id=document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if document.status != DocumentStatus.READY:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="document is not ready for confirmation",
        )
    rows = list_document_spend_items(session, user_id=user.id, document_id=document_id)
    drafts = [item for item in rows if item.status == SpendStatus.PENDING_REVIEW]
    already_confirmed = [item for item in rows if item.status == SpendStatus.CONFIRMED]
    attempt = latest_attempt(session, document_id)
    kind = None
    if attempt is not None and isinstance(attempt.payload, dict):
        kind = attempt.payload.get("document_kind")
    mode = body.mode
    if kind == "statement":
        mode = "line_items"
    confirmed_total = any(item.line_index is None for item in already_confirmed)
    confirmed_lines = any(item.line_index is not None for item in already_confirmed)
    if (mode == "total" and confirmed_lines) or (
        mode == "line_items" and confirmed_total
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="document was already confirmed using the other mode",
        )
    eligible = {
        item.id for item in drafts if (item.line_index is None) == (mode == "total")
    }
    if body.item_ids is not None:
        requested = set(body.item_ids)
        if not requested or not requested <= eligible:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="selected items do not match the confirmation mode",
            )
        selected = list(requested)
    else:
        selected = list(eligible)
    if not selected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="no matching draft items to confirm",
        )
    confirmed = confirm_document_items(
        session, user_id=user.id, document_id=document_id, item_ids=selected
    )
    return [spend_public(item) for item in confirmed]
