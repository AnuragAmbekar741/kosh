class DomainError(Exception):
    status_code = 400
    detail = "Bad request"

    def __init__(self, detail: str | None = None) -> None:
        if detail is not None:
            self.detail = detail
        super().__init__(self.detail)


class NotFoundError(DomainError):
    status_code = 404
    detail = "Not found"


class DuplicateEmailError(DomainError):
    status_code = 409
    detail = "Email already registered"


class InvalidCredentialsError(DomainError):
    status_code = 401
    detail = "Invalid email or password"


class GoogleAccountConflictError(DomainError):
    status_code = 409
    detail = (
        "An account with this email already exists; automatic linking is not allowed"
    )


class InvalidRefreshError(DomainError):
    status_code = 401
    detail = "Not authenticated"


class UnsupportedFileError(DomainError):
    status_code = 415
    detail = "unsupported file type"


class FileTooLargeError(DomainError):
    status_code = 413
    detail = "file exceeds upload limit"


class IdempotencyConflictError(DomainError):
    status_code = 409
    detail = "idempotency key was already used for different content"


class DuplicateUploadError(DomainError):
    status_code = 409
    detail = "duplicate upload"


class TooManyUploadsError(DomainError):
    status_code = 429
    detail = "too many documents are still being processed; try again in a moment"


class StorageWriteError(DomainError):
    status_code = 502
    detail = "storage write failed"


class DocumentNotReadyError(DomainError):
    status_code = 409
    detail = "document is not ready for confirmation"


class NoDraftsToConfirmError(DomainError):
    status_code = 400
    detail = "no draft items to confirm"


class DocumentProcessingError(DomainError):
    status_code = 409
    detail = "document is being processed"


class DocumentNotConfirmedError(DomainError):
    status_code = 409
    detail = "document has no confirmed items"


class DocumentBillNotItemizedError(DomainError):
    status_code = 409
    detail = "document bill is not itemized"


class DocumentNotReceiptError(DomainError):
    status_code = 409
    detail = "line items can only be added to receipts"


class StorageCleanupError(DomainError):
    status_code = 502
    detail = "storage cleanup failed"


class CatalogItemNotFoundError(DomainError):
    status_code = 404
    detail = "catalog item not found"


class NotACatalogFamilyError(DomainError):
    status_code = 422
    detail = "family_id must be a catalog family"


class LineNotMatchableError(DomainError):
    status_code = 409
    detail = "this line is not matched to catalog items"


class AgentBusyError(DomainError):
    status_code = 409
    detail = "a reply is still being written in this conversation"


class AgentDailyLimitError(DomainError):
    status_code = 429
    detail = "daily message limit reached"


class AgentUnavailableError(DomainError):
    status_code = 503
    detail = "the assistant is not configured"
