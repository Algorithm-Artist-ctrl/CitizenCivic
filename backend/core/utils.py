import os
import uuid
import imghdr
from datetime import datetime

from django.conf import settings
from django.core.exceptions import ValidationError


def generate_case_number():
    """
    Generate a unique case number in the format CC-YYYYMMDD-XXXX.
    The last 4 characters are a random hex suffix for uniqueness.
    """
    date_str = datetime.now().strftime('%Y%m%d')
    suffix = uuid.uuid4().hex[:4].upper()
    return f'CC-{date_str}-{suffix}'


def validate_image_file(file):
    """
    Validate that an uploaded file is an allowed image type and within size limits.
    Checks MIME type header AND file content magic bytes.
    """
    allowed_types = getattr(settings, 'ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp'])
    max_size = getattr(settings, 'MAX_IMAGE_FILE_SIZE', 10 * 1024 * 1024)

    # Check file size
    if file.size > max_size:
        raise ValidationError(
            f'File size {file.size} bytes exceeds the maximum allowed size of {max_size} bytes.'
        )

    # Check content type header
    if hasattr(file, 'content_type') and file.content_type not in allowed_types:
        raise ValidationError(
            f'File type "{file.content_type}" is not allowed. '
            f'Allowed types: {", ".join(allowed_types)}'
        )

    # Verify actual content by reading magic bytes
    file.seek(0)
    file_header = file.read(32)
    file.seek(0)

    detected_type = imghdr.what(None, h=file_header)
    valid_extensions = {'jpeg', 'png', 'webp'}
    if detected_type not in valid_extensions:
        raise ValidationError(
            f'File content does not match an allowed image format. Detected: {detected_type}'
        )

    return True
