import os
import boto3
from botocore.config import Config
from django.conf import settings


def get_s3_client():
    """Returns a boto3 S3 client configured with path-style addressing."""
    endpoint_url = os.environ.get('AWS_ENDPOINT_URL') or getattr(settings, 'AWS_S3_ENDPOINT_URL', None)
    region_name = os.environ.get('AWS_REGION') or getattr(settings, 'AWS_S3_REGION_NAME', 'ap-southeast-1')
    access_key = os.environ.get('AWS_ACCESS_KEY_ID') or getattr(settings, 'AWS_ACCESS_KEY_ID', None)
    secret_key = os.environ.get('AWS_SECRET_ACCESS_KEY') or getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)

    config = Config(
        s3={'addressing_style': 'path'},
        signature_version='s3v4',
    )

    kwargs = {
        'service_name': 's3',
        'config': config,
        'region_name': region_name,
    }
    if endpoint_url:
        kwargs['endpoint_url'] = endpoint_url
    if access_key and secret_key:
        kwargs['aws_access_key_id'] = access_key
        kwargs['aws_secret_access_key'] = secret_key

    return boto3.client(**kwargs)


def upload_to_assets_bucket(file_obj, key, bucket=None):
    """
    Uploads a file object to the assets bucket.
    """
    bucket_name = bucket or os.environ.get('AWS_STORAGE_BUCKET_NAME') or getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'assets')
    s3 = get_s3_client()
    s3.upload_fileobj(file_obj, bucket_name, key)
    return key


def get_presigned_view_url(key, bucket=None, expires_in=3600):
    """
    Generates a presigned URL to view an object in the assets bucket (default 1 hr expiry).
    """
    bucket_name = bucket or os.environ.get('AWS_STORAGE_BUCKET_NAME') or getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'assets')
    s3 = get_s3_client()
    url = s3.generate_presigned_url(
        ClientMethod='get_object',
        Params={'Bucket': bucket_name, 'Key': key},
        ExpiresIn=expires_in,
    )
    return url
