"""Presigned S3 access. Raw file bytes never pass through this backend on upload or
download — the browser talks to S3 directly; this module only issues short-lived,
scoped credentials for that (a presigned POST for upload, a presigned GET for download)
and fetches the object server-side once, during processing (see routers/documents.py).

Credentials come from the standard boto3 chain (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
env vars in this build); nothing AWS-specific is stored in our own Settings beyond the
bucket name and region.
"""

import uuid

import boto3
from botocore.exceptions import ClientError

from app.config import get_settings

settings = get_settings()

_client = None


def _s3_client():
    global _client
    if _client is None:
        # Explicit regional endpoint_url, not just region_name: boto3's default S3 addressing
        # otherwise builds presigned URLs against the generic https://bucket.s3.amazonaws.com
        # host, which "opt-in" regions like eu-north-1 don't serve directly — S3 responds with
        # a 307 redirect to the real regional host. A GET follows that redirect transparently,
        # but a browser re-sending a multipart POST (a presigned upload) across a redirect is
        # unreliable. Pointing the client at the regional endpoint up front avoids the redirect
        # entirely — verified live: without this, curl got a 307 instead of a 204 on upload.
        _client = boto3.client(
            "s3",
            region_name=settings.aws_region,
            endpoint_url=f"https://s3.{settings.aws_region}.amazonaws.com",
        )
    return _client


def build_object_key(document_id: uuid.UUID) -> str:
    return f"uploads/{document_id}.pdf"


def create_presigned_upload(object_key: str, content_type: str) -> dict:
    """A presigned POST policy: unlike a presigned PUT, S3 itself enforces the
    content-length-range and exact Content-Type conditions baked in here — a client
    can't upload an oversized file or lie about the content type and have S3 accept it,
    which a raw signed PUT URL wouldn't stop on its own."""
    response = _s3_client().generate_presigned_post(
        Bucket=settings.s3_bucket_name,
        Key=object_key,
        Fields={"Content-Type": content_type},
        Conditions=[
            {"Content-Type": content_type},
            ["content-length-range", 1, settings.max_upload_bytes],
        ],
        ExpiresIn=settings.presigned_upload_expires_seconds,
    )
    return response  # {"url": ..., "fields": {...}}


def create_presigned_download(object_key: str) -> str:
    return _s3_client().generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": settings.s3_bucket_name, "Key": object_key},
        ExpiresIn=settings.presigned_download_expires_seconds,
    )


def object_exists(object_key: str) -> bool:
    try:
        _s3_client().head_object(Bucket=settings.s3_bucket_name, Key=object_key)
        return True
    except ClientError as exc:
        if exc.response["Error"]["Code"] in ("404", "NoSuchKey"):
            return False
        raise


def get_object_size(object_key: str) -> int:
    head = _s3_client().head_object(Bucket=settings.s3_bucket_name, Key=object_key)
    return head["ContentLength"]


def download_object(object_key: str) -> bytes:
    response = _s3_client().get_object(Bucket=settings.s3_bucket_name, Key=object_key)
    return response["Body"].read()


def delete_object(object_key: str) -> None:
    _s3_client().delete_object(Bucket=settings.s3_bucket_name, Key=object_key)
