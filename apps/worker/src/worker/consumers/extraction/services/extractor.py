from ai import extract as extract_from_ai
from storage.settings import get_settings as get_storage_settings


def extract(data: bytes, mime: str):
    return extract_from_ai(
        data, mime, max_upload_mb=get_storage_settings().max_upload_mb
    )
