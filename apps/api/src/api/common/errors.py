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
