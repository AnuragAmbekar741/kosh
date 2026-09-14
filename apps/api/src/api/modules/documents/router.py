from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, File, Header, Response, UploadFile, status
from security import CurrentUserDep
from storage.settings import get_settings as get_storage_settings

from api.common.dependencies import SessionDep
from api.modules.documents import service
from api.modules.documents.presenter import to_detail, to_summary
from api.modules.documents.schemas import (
    AddDocumentLineItemRequest,
    ConfirmDocumentRequest,
    DocumentDetail,
    DocumentSummary,
    DocumentUploadResponse,
)
from api.modules.documents.services.add_line_item import add_line_item
from api.modules.documents.services.confirm import confirm as confirm_document
from api.modules.documents.services.delete import delete_document
from api.modules.documents.services.upload import store_upload
from api.modules.spend.presenter import to_public
from api.modules.spend.schemas import SpendItemPublic

router = APIRouter(prefix="/documents", tags=["documents"])


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
    document = store_upload(
        session,
        user_id=user.id,
        filename=file.filename or "upload",
        data=data,
        idempotency_key=key,
    )
    return DocumentUploadResponse(id=document.id, status=document.status)


@router.get("")
def list_docs(user: CurrentUserDep, session: SessionDep) -> list[DocumentSummary]:
    return [to_summary(document) for document in service.list_owned(session, user.id)]


@router.get("/{document_id}")
def get_doc(
    document_id: UUID, user: CurrentUserDep, session: SessionDep
) -> DocumentDetail:
    return to_detail(session, user.id, service.get(session, user.id, document_id))


@router.post("/{document_id}/confirm")
def confirm(
    document_id: UUID,
    body: ConfirmDocumentRequest,
    user: CurrentUserDep,
    session: SessionDep,
) -> list[SpendItemPublic]:
    return [
        to_public(item)
        for item in confirm_document(
            session, user_id=user.id, document_id=document_id, body=body
        )
    ]


@router.post("/{document_id}/line-items", status_code=status.HTTP_201_CREATED)
def create_line_item(
    document_id: UUID,
    body: AddDocumentLineItemRequest,
    user: CurrentUserDep,
    session: SessionDep,
) -> SpendItemPublic:
    return to_public(
        add_line_item(
            session, user_id=user.id, document_id=document_id, body=body
        )
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_document(
    document_id: UUID, user: CurrentUserDep, session: SessionDep
) -> Response:
    delete_document(session, user_id=user.id, document_id=document_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
