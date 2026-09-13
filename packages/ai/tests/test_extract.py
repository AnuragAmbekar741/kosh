from io import BytesIO
from pathlib import Path

import ai.client as extract_mod
import pytest
from ai import ExtractError, extract, inspect_and_normalize, strict_json_schema
from ai.schemas import Extraction
from PIL import Image
from pydantic import TypeAdapter, ValidationError
from pypdf import PdfWriter


def _jpeg(size: tuple[int, int] = (32, 32)) -> bytes:
    buf = BytesIO()
    Image.new("RGB", size, "white").save(buf, format="JPEG")
    return buf.getvalue()


def _pdf(pages: int = 1) -> bytes:
    buf = BytesIO()
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(72, 72)
    writer.write(buf)
    return buf.getvalue()


def test_normalize_jpeg_downscales() -> None:
    data, mime = inspect_and_normalize(
        _jpeg((2000, 1200)), "image/jpeg", max_upload_mb=15
    )
    assert mime == "image/jpeg"
    image = Image.open(BytesIO(data))
    assert max(image.size) <= 1600


def test_pdf_page_limit(monkeypatch) -> None:
    monkeypatch.setattr(
        extract_mod,
        "get_settings",
        lambda: type(
            "S",
            (),
            {
                "max_pdf_pages": 1,
                "max_image_pixels": 50_000_000,
            },
        )(),
    )
    with pytest.raises(ExtractError, match="too many pages"):
        inspect_and_normalize(_pdf(pages=2), "application/pdf", max_upload_mb=15)


def test_strict_schema_inlines_union() -> None:
    schema = strict_json_schema()
    assert "oneOf" in schema
    assert "$defs" not in schema
    assert all("$ref" not in variant for variant in schema["oneOf"])
    receipt = next(
        variant
        for variant in schema["oneOf"]
        if variant["properties"]["document_kind"]["const"] == "receipt"
    )
    assert "$ref" not in receipt["properties"]["line_items"]["items"]
    assert set(receipt["required"]) == set(receipt["properties"])


def test_invalid_extraction_rejected() -> None:
    with pytest.raises(ValidationError):
        TypeAdapter(Extraction).validate_python({"document_kind": "receipt"})


def test_invalid_money_and_confidence_rejected() -> None:
    payload = {
        "document_kind": "receipt",
        "merchant": "Store",
        "purchased_at": "2024-10-19",
        "currency": "USD",
        "subtotal": None,
        "tax": None,
        "total": "not money",
        "line_items": [],
    }
    with pytest.raises(ValidationError):
        TypeAdapter(Extraction).validate_python(payload)
    payload["total"] = "10.00"
    payload["line_items"] = [
        {
            "raw_description": "A",
            "normalized_name": None,
            "upc": None,
            "quantity": None,
            "unit_price": None,
            "line_total": "10.00",
            "confidence": 2,
            "requires_review": True,
        }
    ]
    with pytest.raises(ValidationError):
        TypeAdapter(Extraction).validate_python(payload)


def test_image_pixel_limit_is_strict(monkeypatch) -> None:
    monkeypatch.setattr(
        extract_mod,
        "get_settings",
        lambda: type(
            "S",
            (),
            {"max_pdf_pages": 1, "max_image_pixels": 100},
        )(),
    )
    with pytest.raises(ExtractError, match="pixel limit"):
        inspect_and_normalize(_jpeg((11, 10)), "image/jpeg", max_upload_mb=15)


@pytest.mark.llm
def test_live_fixture_optional() -> None:
    path = Path(__file__).parent / "fixtures" / "walmart_receipt.jpg"
    if not path.exists():
        pytest.skip("live receipt fixture is not present")
    extraction, _meta = extract(path.read_bytes(), "image/jpeg", max_upload_mb=15)
    assert extraction.document_kind == "receipt"
    from datetime import date

    assert extraction.purchased_at == date(2024, 10, 19)
    assert extraction.total == "56.71"
    assert len(extraction.line_items) == 11
