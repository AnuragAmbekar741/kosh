from datetime import date
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlmodel import Session
from storage import database
from storage.blobs import BlobError
from storage.crud.document import claim_next, get_document_by_id
from storage.models.document import DocumentStatus
from worker.extract import ExtractError, ExtractMeta, RetryableExtractError
from worker.pipeline import process_document
from worker.schemas import LineItem, ReceiptExtraction

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
                confidence=0.9,
                requires_review=False,
            )
        ],
    )


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
        "api.documents.get_settings", lambda: type("S", (), {"max_upload_mb": 0})()
    )
    huge = _upload(client, headers, _JPEG, "big.jpg")
    assert huge.status_code == 413


def test_storage_failure(client, monkeypatch) -> None:
    headers = _auth(client)

    def boom(key: str, data: bytes, content_type: str) -> None:
        raise BlobError("storage write failed")

    monkeypatch.setattr("api.documents.put_bytes", boom)
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

    monkeypatch.setattr("worker.pipeline.extract", fake_extract)
    process_document(document_id, _claim(document_id))
    detail = client.get(f"/documents/{document_id}", headers=headers)
    assert detail.status_code == 200
    body = detail.json()
    assert body["status"] == "ready"
    assert body["extraction"]["merchant"] == "Walmart Neighborhood Market"
    drafts = body["drafts"]
    assert any(item["line_index"] is None for item in drafts)
    line = next(item for item in drafts if item["line_index"] == 0)
    assert client.get("/spend-items", headers=headers).json() == []
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
    total = next(item for item in after["drafts"] if item["line_index"] is None)
    mixed = client.post(
        f"/documents/{document_id}/confirm",
        json={"mode": "total", "item_ids": [total["id"], line["id"]]},
        headers=headers,
    )
    assert mixed.status_code == 400
    confirmed = client.post(
        f"/documents/{document_id}/confirm",
        json={"mode": "total"},
        headers=headers,
    )
    assert confirmed.status_code == 200
    assert confirmed.json()[0]["status"] == "confirmed"
    assert Decimal(confirmed.json()[0]["amount"]) == Decimal("56.71")
    ledger = client.get("/spend-items", headers=headers).json()
    assert len(ledger) == 1
    assert Decimal(ledger[0]["amount"]) == Decimal("56.71")
    pending = [
        item
        for item in client.get(f"/documents/{document_id}", headers=headers).json()[
            "drafts"
        ]
        if item["status"] == "pending_review"
    ]
    assert pending


def test_extract_failure_marks_failed(client, monkeypatch) -> None:
    headers = _auth(client)
    uploaded = _upload(client, headers, _JPEG, "receipt.jpg")
    monkeypatch.setattr(
        "worker.pipeline.extract",
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
        "worker.pipeline.extract",
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

    monkeypatch.setattr("worker.pipeline.extract", fake_extract)
    process_document(document_id, _claim(document_id))
    confirmed = client.post(
        f"/documents/{document_id}/confirm", json={"mode": "total"}, headers=headers
    )
    confirmed_id = confirmed.json()[0]["id"]

    current["total"] = "99.00"
    process_document(document_id, _claim(document_id, requeue=True))

    ledger = client.get("/spend-items", headers=headers).json()
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

    monkeypatch.setattr("worker.pipeline.extract", fake_extract)
    document_id = uploaded.json()["id"]
    process_document(document_id, _claim(document_id))
    detail = client.get(f"/documents/{uploaded.json()['id']}", headers=headers).json()
    assert detail["status"] == "ready"
    assert "differ from total" in detail["error"]
