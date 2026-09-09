import boto3  # type: ignore[import-untyped]
from botocore.client import Config  # type: ignore[import-untyped]
from botocore.exceptions import (  # type: ignore[import-untyped]
    BotoCoreError,
    ClientError,
)

from storage.settings import get_settings

__all__ = ["BlobError", "delete_bytes", "get_bytes", "put_bytes"]


class BlobError(Exception):
    pass


def _client():
    settings = get_settings()
    kwargs: dict = {
        "service_name": "s3",
        "config": Config(s3={"addressing_style": "path"}),
        "region_name": settings.aws_region,
    }
    if settings.aws_endpoint_url_s3:
        kwargs["endpoint_url"] = settings.aws_endpoint_url_s3
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    return boto3.client(**kwargs)


def put_bytes(key: str, data: bytes, content_type: str) -> None:
    settings = get_settings()
    try:
        _client().put_object(
            Bucket=settings.documents_bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
    except (BotoCoreError, ClientError) as exc:
        raise BlobError("storage write failed") from exc


def get_bytes(key: str) -> bytes:
    settings = get_settings()
    try:
        response = _client().get_object(Bucket=settings.documents_bucket, Key=key)
        return response["Body"].read()
    except (BotoCoreError, ClientError) as exc:
        raise BlobError("storage read failed") from exc


def delete_bytes(key: str) -> None:
    settings = get_settings()
    try:
        _client().delete_object(Bucket=settings.documents_bucket, Key=key)
    except (BotoCoreError, ClientError) as exc:
        raise BlobError("storage cleanup failed") from exc
