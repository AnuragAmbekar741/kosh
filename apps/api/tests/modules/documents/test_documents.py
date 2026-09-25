# API + worker integration: upload, then process_document end-to-end.
from datetime import date
from decimal import Decimal
from uuid import UUID, uuid4

from ai import ExtractError, ExtractMeta, RetryableExtractError
from ai.schemas import LineItem, ReceiptExtraction, StatementExtraction, Transaction
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from storage import database
from storage.blobs import BlobError
from storage.crud.document import (
    claim_next,
    get_document_by_id,
    list_extraction_attempts,
)
from storage.models.document import Document, DocumentStatus
from storage.models.spend import SpendItem, SpendSource, SpendStatus
from worker.consumers.extraction.consumer import process_document

_PASSWORD = "password1"
_JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
_PDF = b"%PDF-1.4 test"


def _email() -> str:
    return f"{uuid4().hex}@example.com"


def _auth(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/auth/register",
        json={"name": "Ada", "email": _email(), "password": _PASSWORD},
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _upload(
    client: TestClient, headers: dict[str, str], data: bytes, name: str, **kwargs
):
    return client.post(
        "/documents",
        files={"file": (name, data, "application/octet-stream")},
        headers=headers,
        **kwargs,
    )


def _receipt(*, total: str = "56.71", line_total: str = "56.71") -> ReceiptExtraction:
    return ReceiptExtraction(
        document_kind="receipt",
        merchant="Walmart Neighborhood Market",
        store_location="Corvallis OR",
        purchased_at=date(2024, 10, 19),
        currency="USD",
        subtotal=total,
        tax=None,
        total=total,
        category="Food",
        line_items=[
            LineItem(
                raw_description="ORGAIN VAN 1",
                normalized_name="Orgain vanilla protein",
                upc="851770003920",
                quantity="1",
                unit_price=line_total,
                line_total=line_total,
                category="Food",
                confidence=0.9,
                requires_review=False,
            )
        ],
    )


def _receipt_two_lines() -> ReceiptExtraction:
    return ReceiptExtraction(
        document_kind="receipt",
        merchant="Walmart Neighborhood Market",
        store_location="Corvallis OR",
        purchased_at=date(2024, 10, 19),
        currency="USD",
        subtotal="30.00",
        tax=None,
        total="30.00",
        category="Food",
        line_items=[
            LineItem(
                raw_description="MILK",
                normalized_name="Milk",
                upc=None,
                quantity="1",
                unit_price="10.00",
                line_total="10.00",
                category="Food",
                confidence=0.9,
                requires_review=False,
            ),
            LineItem(
                raw_description="BREAD",
                normalized_name="Bread",
                upc=None,
                quantity="1",
                unit_price="20.00",
                line_total="20.00",
                category="Food",
                confidence=0.9,
                requires_review=False,
            ),
        ],
    )


def _statement() -> StatementExtraction:
    return StatementExtraction(
        document_kind="statement",
        institution="Chase",
        period_start=date(2024, 10, 1),
        period_end=date(2024, 10, 31),
        currency="USD",
        transactions=[
            Transaction(
                merchant="Starbucks",
                amount="4.50",
                spent_at=date(2024, 10, 19),
                category="Food",
                confidence=0.9,
            )
        ],
    )


def _stub_extract(monkeypatch, extraction) -> None:
    monkeypatch.setattr(
        "worker.consumers.extraction.services.extractor.extract",
        lambda data, mime: (
            extraction,
            ExtractMeta(
                model="test", provider="test", prompt_tokens=1, completion_tokens=1
            ),
        ),
    )


def _process(client, monkeypatch, headers, extraction) -> str:
    document_id = _upload(client, headers, _JPEG, "receipt.jpg").json()["id"]
    _stub_extract(monkeypatch, extraction)
    process_document(document_id, _claim(document_id))
    return document_id


def _claim(document_id: str, *, requeue: bool = False) -> UUID:
    with Session(database.engine) as session:
        if requeue:
            document = get_document_by_id(session, UUID(document_id))
            assert document is not None
            document.status = DocumentStatus.UPLOADED
            session.add(document)
            session.commit()
        claimed = claim_next(session)
        assert claimed is not None
        assert str(claimed.id) == document_id
        assert claimed.claim_token is not None
        return claimed.claim_token


def test_upload_jpeg_and_pdf(client) -> None:
    headers = _auth(client)
    jpeg = _upload(client, headers, _JPEG, "receipt.jpg")
    assert jpeg.status_code == 202
    assert jpeg.json()["status"] == "uploaded"
    pdf = _upload(client, headers, _PDF, "stmt.pdf")
    assert pdf.status_code == 202


def test_unsupported_and_oversized(client, monkeypatch) -> None:
    headers = _auth(client)
    bad = _upload(client, headers, b"not-a-file", "notes.txt")
    assert bad.status_code == 415
    monkeypatch.setattr(
        "api.modules.documents.services.upload.get_settings",
        lambda: type("S", (), {"max_upload_mb": 0})(),
    )
    huge = _upload(client, headers, _JPEG, "big.jpg")
    assert huge.status_code == 413


def test_storage_failure(client, monkeypatch) -> None:
    headers = _auth(client)

    def boom(key: str, data: bytes, content_type: str) -> None:
        raise BlobError("storage write failed")

    monkeypatch.setattr("api.modules.documents.services.upload.put_bytes", boom)
    response = _upload(client, headers, _JPEG, "receipt.jpg")
    assert response.status_code == 502


def test_cross_user_and_idempotency(client) -> None:
    headers_a = _auth(client)
    first = _upload(
        client,
        {**headers_a, "Idempotency-Key": "req-1"},
        _JPEG,
        "receipt.jpg",
    )
    again = _upload(
        client,
        {**headers_a, "Idempotency-Key": "req-1"},
        _JPEG,
        "receipt.jpg",
    )
    assert first.json()["id"] == again.json()["id"]
    different = _upload(
        client,
        {**headers_a, "Idempotency-Key": "req-1"},
        b"\x89PNG\r\n\x1a\n" + b"different",
        "different.png",
    )
    assert different.status_code == 409
    listed = client.get("/documents", headers=headers_a)
    assert len(listed.json()) == 1
    headers_b = _auth(client)
    other = client.get(f"/documents/{first.json()['id']}", headers=headers_b)
    assert other.status_code == 404


def test_process_ready_confirm_and_retry_preserves_edits(client, monkeypatch) -> None:
    headers = _auth(client)
    uploaded = _upload(client, headers, _JPEG, "receipt.jpg")
    document_id = uploaded.json()["id"]

    def fake_extract(data: bytes, mime: str):
        return _receipt(), ExtractMeta(
            model="test", provider="test", prompt_tokens=1, completion_tokens=1
        )

    monkeypatch.setattr(
        "worker.consumers.extraction.services.extractor.extract", fake_extract
    )
    process_document(document_id, _claim(document_id))
    detail = client.get(f"/documents/{document_id}", headers=headers)
    assert detail.status_code == 200
    body = detail.json()
    assert body["status"] == "ready"
    assert body["extraction"]["merchant"] == "Walmart Neighborhood Market"
    drafts = body["drafts"]
    assert all(item["line_index"] is not None for item in drafts)
    line = next(item for item in drafts if item["line_index"] == 0)
    assert line["category"] == "Food"
    with Session(database.engine) as session:
        attempts = list_extraction_attempts(session, UUID(document_id))
        assert attempts[0].schema_version == 2
    assert client.get("/spend-items", headers=headers).json()["data"] == []
    patched = client.patch(
        f"/spend-items/{line['id']}",
        json={"merchant": "Edited Merchant"},
        headers=headers,
    )
    assert patched.json()["user_edited"] is True
    process_document(document_id, _claim(document_id, requeue=True))
    after = client.get(f"/documents/{document_id}", headers=headers).json()
    edited = next(item for item in after["drafts"] if item["id"] == line["id"])
    assert edited["merchant"] == "Edited Merchant"
    confirmed = client.post(
        f"/documents/{document_id}/confirm",
        json={"mode": "line_items"},
        headers=headers,
    )
    assert confirmed.status_code == 200
    assert confirmed.json()[0]["status"] == "confirmed"
    assert Decimal(confirmed.json()[0]["amount"]) == Decimal("56.71")
    ledger = client.get("/spend-items", headers=headers).json()["data"]
    assert len(ledger) == 1
    assert Decimal(ledger[0]["amount"]) == Decimal("56.71")
    assert (
        client.get(f"/documents/{document_id}", headers=headers).json()["drafts"] == []
    )


def test_confirm_removes_legacy_total_draft(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _receipt())
    with Session(database.engine) as session:
        line = session.exec(
            select(SpendItem).where(
                SpendItem.document_id == UUID(document_id),
                SpendItem.line_index == 0,
            )
        ).one()
        session.add(
            SpendItem(
                user_id=line.user_id,
                merchant=line.merchant,
                amount=Decimal("56.71"),
                currency=line.currency,
                spent_at=line.spent_at,
                category=line.category,
                source=SpendSource.DOCUMENT,
                status=SpendStatus.PENDING_REVIEW,
                document_id=UUID(document_id),
                extraction_attempt_id=line.extraction_attempt_id,
                line_index=None,
            )
        )
        session.commit()

    confirmed = client.post(f"/documents/{document_id}/confirm", headers=headers)
    assert confirmed.status_code == 200
    assert [item["line_index"] for item in confirmed.json()] == [0]
    with Session(database.engine) as session:
        rows = session.exec(
            select(SpendItem).where(SpendItem.document_id == UUID(document_id))
        ).all()
        assert len(rows) == 1
        assert rows[0].status == SpendStatus.CONFIRMED


def test_confirm_saves_every_extracted_item(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _receipt_two_lines())

    confirmed = client.post(f"/documents/{document_id}/confirm", headers=headers)

    assert confirmed.status_code == 200
    assert {item["description"] for item in confirmed.json()} == {"Milk", "Bread"}
    assert {item["status"] for item in confirmed.json()} == {"confirmed"}


def test_extract_failure_marks_failed(client, monkeypatch) -> None:
    headers = _auth(client)
    uploaded = _upload(client, headers, _JPEG, "receipt.jpg")
    monkeypatch.setattr(
        "worker.consumers.extraction.services.extractor.extract",
        lambda data, mime: (_ for _ in ()).throw(ExtractError("invalid model output")),
    )
    document_id = uploaded.json()["id"]
    process_document(document_id, _claim(document_id))
    detail = client.get(f"/documents/{uploaded.json()['id']}", headers=headers).json()
    assert detail["status"] == DocumentStatus.FAILED
    assert "invalid model output" in detail["error"]


def test_transient_extract_failure_is_retried(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _upload(client, headers, _JPEG, "receipt.jpg").json()["id"]
    monkeypatch.setattr(
        "worker.consumers.extraction.services.extractor.extract",
        lambda data, mime: (_ for _ in ()).throw(
            RetryableExtractError("openrouter rate limited")
        ),
    )
    process_document(document_id, _claim(document_id))
    detail = client.get(f"/documents/{document_id}", headers=headers).json()
    assert detail["status"] == DocumentStatus.UPLOADED
    assert "rate limited" in detail["error"]


def test_reextraction_never_changes_confirmed_ledger(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _upload(client, headers, _JPEG, "receipt.jpg").json()["id"]
    current = {"total": "56.71"}

    def fake_extract(data: bytes, mime: str):
        return _receipt(
            total=current["total"], line_total=current["total"]
        ), ExtractMeta(
            model="test", provider="test", prompt_tokens=1, completion_tokens=1
        )

    monkeypatch.setattr(
        "worker.consumers.extraction.services.extractor.extract", fake_extract
    )
    process_document(document_id, _claim(document_id))
    confirmed = client.post(f"/documents/{document_id}/confirm", headers=headers)
    confirmed_id = confirmed.json()[0]["id"]

    current["total"] = "99.00"
    process_document(document_id, _claim(document_id, requeue=True))

    ledger = client.get("/spend-items", headers=headers).json()["data"]
    assert len(ledger) == 1
    assert ledger[0]["id"] == confirmed_id
    assert ledger[0]["amount"] == "56.71"


def test_sum_mismatch_ready_with_warning(client, monkeypatch) -> None:
    headers = _auth(client)
    uploaded = _upload(client, headers, _JPEG, "receipt.jpg")

    def fake_extract(data: bytes, mime: str):
        return _receipt(total="56.71", line_total="10.00"), ExtractMeta(
            model="test", provider=None, prompt_tokens=1, completion_tokens=1
        )

    monkeypatch.setattr(
        "worker.consumers.extraction.services.extractor.extract", fake_extract
    )
    document_id = uploaded.json()["id"]
    process_document(document_id, _claim(document_id))
    detail = client.get(f"/documents/{uploaded.json()['id']}", headers=headers).json()
    assert detail["status"] == "ready"
    assert "differ from total" in detail["error"]


def test_process_logs_one_outcome_line(client, monkeypatch, caplog) -> None:
    headers = _auth(client)
    document_id = _upload(client, headers, _JPEG, "receipt.jpg").json()["id"]
    monkeypatch.setattr(
        "worker.consumers.extraction.services.extractor.extract",
        lambda data, mime: (_ for _ in ()).throw(
            RetryableExtractError("openrouter rate limited")
        ),
    )
    process_document(document_id, _claim(document_id))
    (finished,) = [
        record
        for record in caplog.records
        if record.getMessage() == "extraction finished"
    ]
    assert finished.levelname == "WARNING"
    assert finished.outcome == "retry"
    assert "rate limited" in finished.reason


def test_add_line_item_to_confirmed_itemized_bill(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _receipt())
    confirmed = client.post(f"/documents/{document_id}/confirm", headers=headers)
    assert confirmed.status_code == 200
    added = client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "Bananas", "amount": "2.50", "category": "produce"},
        headers=headers,
    )
    assert added.status_code == 201
    body = added.json()
    assert body["description"] == "Bananas"
    assert body["amount"] == "2.50"
    assert body["category"] == "produce"
    assert body["merchant"] == "Walmart Neighborhood Market"
    assert body["spent_at"] == "2024-10-19"
    assert body["currency"] == "USD"
    assert body["line_index"] == 1
    assert body["source"] == "document"
    assert body["status"] == "confirmed"
    assert body["user_edited"] is True
    ledger = client.get("/spend-items", headers=headers).json()["data"]
    assert any(item["id"] == body["id"] for item in ledger)


def test_add_line_item_increments_line_index(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _receipt_two_lines())
    client.post(f"/documents/{document_id}/confirm", headers=headers)
    first = client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "Eggs", "amount": "3.00"},
        headers=headers,
    )
    second = client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "Butter", "amount": "4.00"},
        headers=headers,
    )
    assert first.json()["line_index"] == 2
    assert second.json()["line_index"] == 3


def test_add_line_item_rejects_unconfirmed_document(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _receipt())
    response = client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "Bananas", "amount": "2.50"},
        headers=headers,
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "document has no confirmed items"


def test_add_line_item_rejects_statement(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _statement())
    detail = client.get(f"/documents/{document_id}", headers=headers).json()
    assert [item["category"] for item in detail["drafts"]] == ["Food"]
    client.post(f"/documents/{document_id}/confirm", headers=headers)
    response = client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "Coffee", "amount": "4.50"},
        headers=headers,
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "line items can only be added to receipts"


def test_add_line_item_rejects_processing_document(client) -> None:
    headers = _auth(client)
    document_id = _upload(client, headers, _JPEG, "receipt.jpg").json()["id"]
    _claim(document_id)
    response = client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "Bananas", "amount": "2.50"},
        headers=headers,
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "document is being processed"


def test_add_line_item_cross_user(client, monkeypatch) -> None:
    headers_a = _auth(client)
    document_id = _process(client, monkeypatch, headers_a, _receipt())
    client.post(f"/documents/{document_id}/confirm", headers=headers_a)
    headers_b = _auth(client)
    response = client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "Bananas", "amount": "2.50"},
        headers=headers_b,
    )
    assert response.status_code == 404


def test_add_line_item_validation(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _receipt())
    client.post(f"/documents/{document_id}/confirm", headers=headers)
    zero = client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "Bananas", "amount": "0"},
        headers=headers,
    )
    assert zero.status_code == 422
    empty = client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "", "amount": "2.50"},
        headers=headers,
    )
    assert empty.status_code == 422


def test_delete_confirmed_document_bill(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _receipt())
    client.post(f"/documents/{document_id}/confirm", headers=headers)
    deleted = client.delete(f"/documents/{document_id}", headers=headers)
    assert deleted.status_code == 204
    assert client.get(f"/documents/{document_id}", headers=headers).status_code == 404
    assert client.get("/spend-items", headers=headers).json()["data"] == []
    listed = client.get("/documents", headers=headers).json()
    assert listed == []


def test_delete_document_removes_blob(client, monkeypatch, blob_store) -> None:
    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _receipt())
    keys = list(blob_store)
    assert keys
    client.delete(f"/documents/{document_id}", headers=headers)
    for key in keys:
        assert key not in blob_store


def test_delete_document_with_pending_drafts(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _receipt())
    deleted = client.delete(f"/documents/{document_id}", headers=headers)
    assert deleted.status_code == 204
    with Session(database.engine) as session:
        assert (
            session.exec(
                select(SpendItem).where(SpendItem.document_id == UUID(document_id))
            ).all()
            == []
        )
        assert list_extraction_attempts(session, UUID(document_id)) == []
        assert session.get(Document, UUID(document_id)) is None


def test_delete_document_cross_user(client, monkeypatch) -> None:
    headers_a = _auth(client)
    document_id = _process(client, monkeypatch, headers_a, _receipt())
    headers_b = _auth(client)
    response = client.delete(f"/documents/{document_id}", headers=headers_b)
    assert response.status_code == 404
    assert client.get(f"/documents/{document_id}", headers=headers_a).status_code == 200


def test_delete_document_rejects_processing(client, blob_store) -> None:
    headers = _auth(client)
    document_id = _upload(client, headers, _JPEG, "receipt.jpg").json()["id"]
    _claim(document_id)
    keys = list(blob_store)
    response = client.delete(f"/documents/{document_id}", headers=headers)
    assert response.status_code == 409
    assert response.json()["detail"] == "document is being processed"
    assert client.get(f"/documents/{document_id}", headers=headers).json()[
        "status"
    ] == ("processing")
    for key in keys:
        assert key in blob_store


def test_delete_document_blob_failure_rolls_back(
    client, monkeypatch, blob_store
) -> None:
    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _receipt())

    def boom(key: str) -> None:
        raise BlobError("storage cleanup failed")

    monkeypatch.setattr("storage.blobs.delete_bytes", boom)
    response = client.delete(f"/documents/{document_id}", headers=headers)
    assert response.status_code == 502
    assert client.get(f"/documents/{document_id}", headers=headers).status_code == 200
    assert blob_store


def test_delete_document_leaves_other_bills(client, monkeypatch) -> None:
    headers = _auth(client)
    keep_id = _process(client, monkeypatch, headers, _receipt())
    client.post(f"/documents/{keep_id}/confirm", headers=headers)
    drop_id = _upload(client, headers, _PDF, "other.pdf").json()["id"]
    _stub_extract(monkeypatch, _receipt(total="10.00", line_total="10.00"))
    process_document(drop_id, _claim(drop_id))
    client.post(f"/documents/{drop_id}/confirm", headers=headers)
    client.delete(f"/documents/{drop_id}", headers=headers)
    ledger = client.get("/spend-items", headers=headers).json()["data"]
    assert len(ledger) == 1
    assert ledger[0]["document_id"] == keep_id
    assert client.get(f"/documents/{keep_id}", headers=headers).status_code == 200


def test_delete_document_with_multiple_attempts(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _receipt())
    process_document(document_id, _claim(document_id, requeue=True))
    client.delete(f"/documents/{document_id}", headers=headers)
    with Session(database.engine) as session:
        assert list_extraction_attempts(session, UUID(document_id)) == []
        assert session.get(Document, UUID(document_id)) is None
        assert (
            session.exec(
                select(SpendItem).where(SpendItem.document_id == UUID(document_id))
            ).all()
            == []
        )


def test_create_manual_document(client) -> None:
    headers = _auth(client)
    response = client.post(
        "/documents/manual",
        json={"title": "Weekend trip"},
        headers=headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["filename"] == "Weekend trip"
    assert body["source"] == "manual"
    assert body["status"] == "ready"
    assert body["mime_type"] == "application/x-manual-spend"
    assert body["size_bytes"] == 0
    listed = client.get("/documents", headers=headers).json()
    assert any(item["id"] == body["id"] for item in listed)
    with Session(database.engine) as session:
        document = session.get(Document, UUID(body["id"]))
        assert document is not None
        assert document.storage_key == ""
        assert document.content_hash.startswith("manual:")
        assert claim_next(session) is None


def test_create_manual_document_rejects_blank_title(client) -> None:
    headers = _auth(client)
    empty = client.post("/documents/manual", json={"title": ""}, headers=headers)
    assert empty.status_code == 422
    blank = client.post("/documents/manual", json={"title": "   "}, headers=headers)
    assert blank.status_code == 422


def test_add_line_item_to_empty_manual_document(client) -> None:
    headers = _auth(client)
    created = client.post(
        "/documents/manual",
        json={"title": "Groceries"},
        headers=headers,
    )
    document_id = created.json()["id"]
    added = client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "Bananas", "amount": "2.50", "category": "Food"},
        headers=headers,
    )
    assert added.status_code == 201
    body = added.json()
    assert body["description"] == "Bananas"
    assert body["amount"] == "2.50"
    assert body["category"] == "Food"
    assert body["merchant"] == "Groceries"
    assert body["currency"] == "USD"
    assert body["line_index"] == 0
    assert body["source"] == "manual"
    assert body["status"] == "confirmed"
    assert body["document_id"] == document_id
    assert body["user_edited"] is True
    second = client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "Milk", "amount": "4.00", "category": "Food"},
        headers=headers,
    )
    assert second.status_code == 201
    assert second.json()["line_index"] == 1
    assert second.json()["merchant"] == "Groceries"
    assert second.json()["spent_at"] == body["spent_at"]
    ledger = client.get("/spend-items", headers=headers).json()["data"]
    assert {item["description"] for item in ledger} == {"Bananas", "Milk"}


def test_delete_manual_document_skips_blob(client, monkeypatch, blob_store) -> None:
    headers = _auth(client)
    created = client.post(
        "/documents/manual",
        json={"title": "Weekend trip"},
        headers=headers,
    )
    document_id = created.json()["id"]
    client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "Coffee", "amount": "4.50"},
        headers=headers,
    )

    def boom(key: str) -> None:
        raise BlobError("storage cleanup failed")

    monkeypatch.setattr("storage.blobs.delete_bytes", boom)
    deleted = client.delete(f"/documents/{document_id}", headers=headers)
    assert deleted.status_code == 204
    assert client.get(f"/documents/{document_id}", headers=headers).status_code == 404
    assert client.get("/spend-items", headers=headers).json()["data"] == []
    assert blob_store == {}
