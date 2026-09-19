from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlmodel import Session
from storage.crud.document import create_document
from storage.models.document import Document, DocumentSource, DocumentStatus

from api.modules.documents.schemas import ManualDocumentCreate

MANUAL_MIME = "application/x-manual-spend"


def create_manual(
    session: Session, *, user_id: UUID, body: ManualDocumentCreate
) -> Document:
    document_id = uuid4()
    now = datetime.now(UTC)
    return create_document(
        session,
        Document(
            id=document_id,
            user_id=user_id,
            filename=body.title[:255],
            mime_type=MANUAL_MIME,
            size_bytes=0,
            storage_key="",
            content_hash=f"manual:{document_id}",
            source=DocumentSource.MANUAL,
            status=DocumentStatus.READY,
            processed_at=now,
        ),
    )
