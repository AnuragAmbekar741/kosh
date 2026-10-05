"""Checks and normalizes an uploaded bill before it goes to the model."""

from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from ai.openrouter import ExtractError
from ai.settings import get_settings

try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
except ImportError:
    pass

__all__ = ["inspect_and_normalize"]


def inspect_and_normalize(
    data: bytes, mime: str, *, max_upload_mb: int
) -> tuple[bytes, str]:
    settings = get_settings()
    max_bytes = max_upload_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise ExtractError("file exceeds upload limit")
    if mime == "application/pdf":
        _inspect_pdf(data, settings.max_pdf_pages)
        return data, mime
    if not mime.startswith("image/"):
        raise ExtractError("unsupported file type")
    return _normalize_image(data, settings.max_image_pixels)


def _inspect_pdf(data: bytes, max_pages: int) -> None:
    try:
        reader = PdfReader(BytesIO(data))
        if reader.is_encrypted:
            raise ExtractError("encrypted pdf")
        if len(reader.pages) > max_pages:
            raise ExtractError("pdf has too many pages")
    except ExtractError:
        raise
    except (PdfReadError, OSError, ValueError) as exc:
        raise ExtractError("corrupt pdf") from exc


def _normalize_image(data: bytes, max_pixels: int) -> tuple[bytes, str]:
    previous = Image.MAX_IMAGE_PIXELS
    Image.MAX_IMAGE_PIXELS = None
    try:
        image = Image.open(BytesIO(data))
        if image.width * image.height > max_pixels:
            raise ExtractError("image exceeds pixel limit")
        image.load()
    except Image.DecompressionBombError as exc:
        raise ExtractError("image exceeds pixel limit") from exc
    except (UnidentifiedImageError, OSError) as exc:
        raise ExtractError("unreadable image") from exc
    finally:
        Image.MAX_IMAGE_PIXELS = previous
    normalized = ImageOps.exif_transpose(image).convert("RGB")
    normalized.thumbnail((1600, 1600))
    out = BytesIO()
    normalized.save(out, format="JPEG", quality=85)
    return out.getvalue(), "image/jpeg"
