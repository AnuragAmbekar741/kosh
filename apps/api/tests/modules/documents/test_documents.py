# API + worker integration: upload, then run the extraction job end-to-end.
from datetime import date
from decimal import Decimal
from uuid import UUID, uuid4

from ai import (
    ExtractError,
    ExtractMeta,
    LineItem,
    ReceiptExtraction,
    RetryableExtractError,
    StatementExtraction,
    Transaction,
)
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
from worker.jobs.extraction import JOB
from worker.runtime import Claim

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
        line_items=[
            LineItem(
                raw_description="ORGAIN VAN 1",
                normalized_name="Orgain vanilla protein",
                upc="851770003920",
                quantity="1",
                unit_price=line_total,
                line_total=line_total,
                category="Groceries",
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
        line_items=[
            LineItem(
                raw_description="MILK",
                normalized_name="Milk",
                upc=None,
                quantity="1",
                unit_price="10.00",
                line_total="10.00",
                category="Groceries",
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
                category="Groceries",
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
                category="Dining out",
                confidence=0.9,
            )
        ],
    )


def _stub_extract(monkeypatch, extraction) -> None:
    monkeypatch.setattr(
        "ai.extract",
        lambda data, mime, **_: (
            extraction,
            ExtractMeta(
                model="test", provider="test", prompt_tokens=1, completion_tokens=1
            ),
        ),
    )


def _process(client, monkeypatch, headers, extraction) -> str:
    document_id = _upload(client, headers, _JPEG, "receipt.jpg").json()["id"]
    _stub_extract(monkeypatch, extraction)
    JOB.run(_claim(document_id))
    return document_id


def _claim(document_id: str, *, requeue: bool = False) -> Claim:
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
        return Claim(claimed.id, claimed.claim_token)


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

    def fake_extract(data: bytes, mime: str, **_: object):
        return _receipt(), ExtractMeta(
            model="test", provider="test", prompt_tokens=1, completion_tokens=1
        )

    monkeypatch.setattr("ai.extract", fake_extract)
    JOB.run(_claim(document_id))
    detail = client.get(f"/documents/{document_id}", headers=headers)
    assert detail.status_code == 200
    body = detail.json()
    assert body["status"] == "ready"
    assert body["extraction"]["merchant"] == "Walmart Neighborhood Market"
    drafts = body["drafts"]
    assert all(item["line_index"] is not None for item in drafts)
    assert [item["category"] for item in drafts] == ["Groceries"]
    assert [item["description"] for item in drafts] == ["ORGAIN VAN 1"]
    line = next(item for item in drafts if item["line_index"] == 0)
    with Session(database.engine) as session:
        attempts = list_extraction_attempts(session, UUID(document_id))
        assert attempts[0].schema_version == 4
    assert client.get("/spend-items", headers=headers).json()["data"] == []
    patched = client.patch(
        f"/spend-items/{line['id']}",
        json={"merchant": "Edited Merchant"},
        headers=headers,
    )
    assert patched.json()["user_edited"] is True
    JOB.run(_claim(document_id, requeue=True))
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
    assert {item["description"] for item in confirmed.json()} == {"MILK", "BREAD"}
    assert {item["status"] for item in confirmed.json()} == {"confirmed"}


def test_extract_failure_marks_failed(client, monkeypatch) -> None:
    headers = _auth(client)
    uploaded = _upload(client, headers, _JPEG, "receipt.jpg")
    monkeypatch.setattr(
        "ai.extract",
        lambda data, mime, **_: (_ for _ in ()).throw(
            ExtractError("invalid model output")
        ),
    )
    document_id = uploaded.json()["id"]
    JOB.run(_claim(document_id))
    detail = client.get(f"/documents/{uploaded.json()['id']}", headers=headers).json()
    assert detail["status"] == DocumentStatus.FAILED
    assert "invalid model output" in detail["error"]


def test_transient_extract_failure_is_retried(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _upload(client, headers, _JPEG, "receipt.jpg").json()["id"]
    monkeypatch.setattr(
        "ai.extract",
        lambda data, mime, **_: (_ for _ in ()).throw(
            RetryableExtractError("openrouter rate limited")
        ),
    )
    JOB.run(_claim(document_id))
    detail = client.get(f"/documents/{document_id}", headers=headers).json()
    assert detail["status"] == DocumentStatus.UPLOADED
    assert "rate limited" in detail["error"]


def test_reextraction_never_changes_confirmed_ledger(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _upload(client, headers, _JPEG, "receipt.jpg").json()["id"]
    current = {"total": "56.71"}

    def fake_extract(data: bytes, mime: str, **_: object):
        return _receipt(
            total=current["total"], line_total=current["total"]
        ), ExtractMeta(
            model="test", provider="test", prompt_tokens=1, completion_tokens=1
        )

    monkeypatch.setattr("ai.extract", fake_extract)
    JOB.run(_claim(document_id))
    confirmed = client.post(f"/documents/{document_id}/confirm", headers=headers)
    confirmed_id = confirmed.json()[0]["id"]

    current["total"] = "99.00"
    JOB.run(_claim(document_id, requeue=True))

    ledger = client.get("/spend-items", headers=headers).json()["data"]
    assert len(ledger) == 1
    assert ledger[0]["id"] == confirmed_id
    assert ledger[0]["amount"] == "56.71"


def test_sum_mismatch_ready_with_warning(client, monkeypatch) -> None:
    headers = _auth(client)
    uploaded = _upload(client, headers, _JPEG, "receipt.jpg")

    def fake_extract(data: bytes, mime: str, **_: object):
        return _receipt(total="56.71", line_total="10.00"), ExtractMeta(
            model="test", provider=None, prompt_tokens=1, completion_tokens=1
        )

    monkeypatch.setattr("ai.extract", fake_extract)
    document_id = uploaded.json()["id"]
    JOB.run(_claim(document_id))
    detail = client.get(f"/documents/{uploaded.json()['id']}", headers=headers).json()
    assert detail["status"] == "ready"
    assert "differ from total" in detail["error"]


def test_process_logs_one_outcome_line(client, monkeypatch, caplog) -> None:
    headers = _auth(client)
    document_id = _upload(client, headers, _JPEG, "receipt.jpg").json()["id"]
    monkeypatch.setattr(
        "ai.extract",
        lambda data, mime, **_: (_ for _ in ()).throw(
            RetryableExtractError("openrouter rate limited")
        ),
    )
    JOB.run(_claim(document_id))
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
        json={"description": "Bananas", "amount": "2.50", "category": "Groceries"},
        headers=headers,
    )
    assert added.status_code == 201
    body = added.json()
    assert body["description"] == "Bananas"
    assert body["amount"] == "2.50"
    assert body["merchant"] == "Walmart Neighborhood Market"
    assert body["spent_at"] == "2024-10-19"
    assert body["currency"] == "USD"
    assert body["category"] == "Groceries"
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
        json={"description": "Eggs", "amount": "3.00", "category": "Groceries"},
        headers=headers,
    )
    second = client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "Butter", "amount": "4.00", "category": "Groceries"},
        headers=headers,
    )
    assert first.json()["line_index"] == 2
    assert second.json()["line_index"] == 3


def test_add_line_item_rejects_unconfirmed_document(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _receipt())
    response = client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "Bananas", "amount": "2.50", "category": "Groceries"},
        headers=headers,
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "document has no confirmed items"


def test_add_line_item_rejects_statement(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _statement())
    client.post(f"/documents/{document_id}/confirm", headers=headers)
    response = client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "Coffee", "amount": "4.50", "category": "Dining out"},
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
        json={"description": "Bananas", "amount": "2.50", "category": "Groceries"},
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
        json={"description": "Bananas", "amount": "2.50", "category": "Groceries"},
        headers=headers_b,
    )
    assert response.status_code == 404


def test_add_line_item_validation(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _receipt())
    client.post(f"/documents/{document_id}/confirm", headers=headers)
    zero = client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "Bananas", "amount": "0", "category": "Groceries"},
        headers=headers,
    )
    assert zero.status_code == 422
    empty = client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "", "amount": "2.50", "category": "Groceries"},
        headers=headers,
    )
    assert empty.status_code == 422
    for category in (None, "Food"):
        body = {"description": "Bananas", "amount": "2.50"}
        if category:
            body["category"] = category
        response = client.post(
            f"/documents/{document_id}/line-items", json=body, headers=headers
        )
        assert response.status_code == 422


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
    JOB.run(_claim(drop_id))
    client.post(f"/documents/{drop_id}/confirm", headers=headers)
    client.delete(f"/documents/{drop_id}", headers=headers)
    ledger = client.get("/spend-items", headers=headers).json()["data"]
    assert len(ledger) == 1
    assert ledger[0]["document_id"] == keep_id
    assert client.get(f"/documents/{keep_id}", headers=headers).status_code == 200


def test_delete_document_with_multiple_attempts(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _receipt())
    JOB.run(_claim(document_id, requeue=True))
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
        json={"description": "Bananas", "amount": "2.50", "category": "Groceries"},
        headers=headers,
    )
    assert added.status_code == 201
    body = added.json()
    assert body["description"] == "Bananas"
    assert body["amount"] == "2.50"
    assert body["merchant"] == "Groceries"
    assert body["currency"] == "USD"
    assert body["line_index"] == 0
    assert body["source"] == "manual"
    assert body["status"] == "confirmed"
    assert body["document_id"] == document_id
    assert body["user_edited"] is True
    second = client.post(
        f"/documents/{document_id}/line-items",
        json={"description": "Milk", "amount": "4.00", "category": "Groceries"},
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
        json={"description": "Coffee", "amount": "4.50", "category": "Dining out"},
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


def _lines(document_id: str) -> list[SpendItem]:
    with Session(database.engine) as session:
        return list(
            session.exec(
                select(SpendItem)
                .where(SpendItem.document_id == UUID(document_id))
                .order_by(SpendItem.line_index)
            ).all()
        )


def test_confirming_a_receipt_queues_lines_for_items(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _receipt_two_lines())
    client.post(f"/documents/{document_id}/confirm", headers=headers)
    lines = _lines(document_id)
    assert [line.item_status for line in lines] == ["pending", "pending"]
    assert {line.category_source for line in lines} == {"extraction"}


def test_confirming_a_statement_does_not_queue(client, monkeypatch) -> None:
    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _statement())
    client.post(f"/documents/{document_id}/confirm", headers=headers)
    assert [line.item_status for line in _lines(document_id)] == ["none"]


def test_added_lines_are_queued_with_the_users_category(client, monkeypatch) -> None:
    headers = _auth(client)
    receipt_id = _process(client, monkeypatch, headers, _receipt())
    client.post(f"/documents/{receipt_id}/confirm", headers=headers)
    manual_id = client.post(
        "/documents/manual", json={"title": "Market"}, headers=headers
    ).json()["id"]
    for document_id in (receipt_id, manual_id):
        added = client.post(
            f"/documents/{document_id}/line-items",
            json={"description": "Bananas", "amount": "2.50", "category": "Groceries"},
            headers=headers,
        ).json()
        line = next(row for row in _lines(document_id) if str(row.id) == added["id"])
        assert line.item_status == "pending"
        assert line.category_source == "user"


def test_editing_text_requeues_and_editing_category_marks_it_user_set(
    client, monkeypatch
) -> None:
    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _receipt())
    client.post(f"/documents/{document_id}/confirm", headers=headers)
    line_id = _lines(document_id)[0].id
    with Session(database.engine) as session:
        line = session.get(SpendItem, line_id)
        assert line is not None
        line.item_status = "resolved"
        line.item_claim_token = uuid4()
        session.add(line)
        session.commit()
    client.patch(
        f"/spend-items/{line_id}", json={"category": "Health"}, headers=headers
    )
    line = _lines(document_id)[0]
    assert (line.item_status, line.category_source) == ("resolved", "user")
    client.patch(
        f"/spend-items/{line_id}",
        json={"description": "ORGAIN PROTEIN"},
        headers=headers,
    )
    line = _lines(document_id)[0]
    assert line.item_status == "pending"
    assert line.item_claim_token is None


def test_spend_lines_return_their_catalog_item(client, monkeypatch) -> None:
    from storage.crud.catalog import CatalogRow, load_shared_catalog
    from storage.models.catalog import CatalogItem

    headers = _auth(client)
    document_id = _process(client, monkeypatch, headers, _receipt())
    client.post(f"/documents/{document_id}/confirm", headers=headers)
    with Session(database.engine) as session:
        load_shared_catalog(
            session,
            [
                CatalogRow("chicken", None, "Chicken", (), "Groceries"),
                CatalogRow("chicken-breast", "chicken", "Chicken breast", (), None),
            ],
        )
        breast = session.exec(
            select(CatalogItem).where(CatalogItem.slug == "chicken-breast")
        ).one()
        line = session.exec(
            select(SpendItem).where(SpendItem.document_id == UUID(document_id))
        ).one()
        line.catalog_item_id = breast.id
        line.item_status = "resolved"
        session.add(line)
        session.commit()
        line_id = str(line.id)
    listed = client.get("/spend-items", headers=headers).json()["data"][0]
    assert listed["item_status"] == "resolved"
    assert listed["item"]["name"] == "Chicken breast"
    assert listed["item"]["family"] == "Chicken"
    one = client.get(f"/spend-items/{line_id}", headers=headers).json()
    assert one["item"] == listed["item"]


def _seed_catalog() -> dict[str, UUID]:
    from storage.crud.catalog import CatalogRow, load_shared_catalog
    from storage.models.catalog import CatalogItem

    with Session(database.engine) as session:
        load_shared_catalog(
            session,
            [
                CatalogRow("sports-nutrition", None, "Sports nutrition", (), "Health"),
                CatalogRow(
                    "protein-powder", "sports-nutrition", "Protein powder", (), None
                ),
            ],
        )
        return {
            row.slug or "": row.id for row in session.exec(select(CatalogItem)).all()
        }


def _receipt_line(client, monkeypatch, headers) -> str:
    document_id = _process(client, monkeypatch, headers, _receipt())
    client.post(f"/documents/{document_id}/confirm", headers=headers)
    return str(_lines(document_id)[0].id)


def _set_status(line_id: str, **fields) -> None:
    with Session(database.engine) as session:
        line = session.get(SpendItem, UUID(line_id))
        assert line is not None
        for key, value in fields.items():
            setattr(line, key, value)
        session.add(line)
        session.commit()


def test_correcting_an_item_learns_and_spreads(client, monkeypatch) -> None:
    from storage.models.catalog import CatalogAlias

    ids = _seed_catalog()
    headers = _auth(client)
    first = _receipt_line(client, monkeypatch, headers)
    same_text = _receipt_line(client, monkeypatch, headers)
    hand_set = _receipt_line(client, monkeypatch, headers)
    _set_status(same_text, item_status="needs_review")
    _set_status(hand_set, item_status="resolved", item_method="user")

    response = client.put(
        f"/spend-items/{first}/item",
        json={"catalog_item_id": str(ids["protein-powder"])},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["item"]["name"] == "Protein powder"
    assert body["item"]["family"] == "Sports nutrition"
    assert body["item_status"] == "resolved"
    assert body["category"] == "Health"
    assert body["description"] == "ORGAIN VAN 1"

    with Session(database.engine) as session:
        spread = session.get(SpendItem, UUID(same_text))
        kept = session.get(SpendItem, UUID(hand_set))
        assert spread is not None and kept is not None
        assert (spread.item_status, spread.item_method) == ("resolved", "alias")
        assert spread.catalog_item_id == ids["protein-powder"]
        assert kept.catalog_item_id is None
        aliases = {
            (a.kind, a.merchant_key, a.source)
            for a in session.exec(select(CatalogAlias)).all()
        }
    merchant = "walmart neighborhood market"
    assert aliases == {
        ("text", merchant, "user"),
        ("text", "", "user"),
        ("code", merchant, "user"),
    }


def test_marking_not_a_product(client, monkeypatch) -> None:
    headers = _auth(client)
    line = _receipt_line(client, monkeypatch, headers)
    body = client.put(
        f"/spend-items/{line}/item", json={"not_product": True}, headers=headers
    ).json()
    assert (body["item_status"], body["item"], body["category"]) == (
        "not_product",
        None,
        "Groceries",
    )


def test_creating_a_private_item(client, monkeypatch) -> None:
    ids = _seed_catalog()
    headers = _auth(client)
    line = _receipt_line(client, monkeypatch, headers)
    new_item = {"name": "Vanilla shake mix", "family_id": str(ids["sports-nutrition"])}
    body = client.put(
        f"/spend-items/{line}/item", json={"new_item": new_item}, headers=headers
    ).json()
    assert body["item"]["name"] == "Vanilla shake mix"
    again = client.put(
        f"/spend-items/{line}/item", json={"new_item": new_item}, headers=headers
    ).json()
    assert again["item"]["id"] == body["item"]["id"]
    found = client.get(
        "/catalog/search", params={"q": "vanilla"}, headers=headers
    ).json()
    assert [(e["name"], e["mine"]) for e in found] == [("Vanilla shake mix", True)]

    other = _auth(client)
    assert (
        client.get("/catalog/search", params={"q": "vanilla"}, headers=other).json()
        == []
    )
    other_line = _receipt_line(client, monkeypatch, other)
    hidden = client.put(
        f"/spend-items/{other_line}/item",
        json={"catalog_item_id": body["item"]["id"]},
        headers=other,
    )
    assert hidden.status_code == 404
    not_family = client.put(
        f"/spend-items/{line}/item",
        json={"new_item": {"name": "X", "family_id": str(ids["protein-powder"])}},
        headers=headers,
    )
    assert not_family.status_code == 422


def test_item_corrections_are_validated(client, monkeypatch) -> None:
    headers = _auth(client)
    statement_id = _process(client, monkeypatch, headers, _statement())
    client.post(f"/documents/{statement_id}/confirm", headers=headers)
    row = str(_lines(statement_id)[0].id)
    assert (
        client.put(
            f"/spend-items/{row}/item", json={"not_product": True}, headers=headers
        ).status_code
        == 409
    )
    line = _receipt_line(client, monkeypatch, headers)
    for body in ({}, {"not_product": True, "catalog_item_id": str(uuid4())}):
        assert (
            client.put(
                f"/spend-items/{line}/item", json=body, headers=headers
            ).status_code
            == 422
        )
