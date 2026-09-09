import hashlib
from uuid import UUID, uuid4

from sqlmodel import Session
from storage.blobs import BlobError, delete_bytes, put_bytes
from storage.crud.document import create_document, get_document_by_idempotency
from storage.models.document import Document, DocumentSource, DocumentStatus
from storage.settings import get_settings

__all__ = [
    "FileTooLargeError",
    "IdempotencyConflictError",
    "UnsupportedFileError",
    "sniff_mime",
    "store_upload",
]

_JPEG = b"\xff\xd8\xff"
_PNG = b"\x89PNG\r\n\x1a\n"
_PDF = b"%PDF"
_GIF87 = b"GIF87a"
_GIF89 = b"GIF89a"
_HEIC_BRANDS = {b"heic", b"heif", b"mif1", b"msf1", b"heix"}


class UnsupportedFileError(Exception):
    pass


class FileTooLargeError(Exception):
    pass


class IdempotencyConflictError(Exception):
    pass


def sniff_mime(data: bytes) -> str:
    if data.startswith(_PDF):
        return "application/pdf"
    if data.startswith(_JPEG):
        return "image/jpeg"
    if data.startswith(_PNG):
        return "image/png"
    if data.startswith((_GIF87, _GIF89)):
        return "image/gif"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "image/webp"
    if len(data) >= 12 and data[4:8] == b"ftyp" and data[8:12] in _HEIC_BRANDS:
        return "image/heic"
    raise UnsupportedFileError("unsupported file type")


def store_upload(
    session: Session,
    *,
    user_id: UUID,
    filename: str,
    data: bytes,
    idempotency_key: str | None,
    source: str = DocumentSource.DASHBOARD,
) -> Document:
    settings = get_settings()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise FileTooLargeError("file exceeds upload limit")
    mime_type = sniff_mime(data)
    content_hash = hashlib.sha256(data).hexdigest()
    if idempotency_key:
        existing = get_document_by_idempotency(
            session, user_id=user_id, idempotency_key=idempotency_key
        )
        if existing is not None:
            if existing.content_hash != content_hash:
                raise IdempotencyConflictError(
                    "idempotency key was already used for different content"
                )
            return existing
    document_id = uuid4()
    storage_key = f"users/{user_id}/{document_id}"
    put_bytes(storage_key, data, mime_type)
    document = Document(
        id=document_id,
        user_id=user_id,
        filename=(filename or "upload")[:255],
        mime_type=mime_type,
        size_bytes=len(data),
        storage_key=storage_key,
        content_hash=content_hash,
        idempotency_key=idempotency_key,
        source=source,
        status=DocumentStatus.UPLOADED,
    )
    try:
        return create_document(session, document)
    except Exception:
        try:
            delete_bytes(storage_key)
        except BlobError:
            pass
        raise
