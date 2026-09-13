from storage.blobs import get_bytes


def load(storage_key: str) -> bytes:
    return get_bytes(storage_key)
