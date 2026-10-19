import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3 Client configured for S3-compatible object storage with forcePathStyle: true
export const s3Client = new S3Client({
  forcePathStyle: true,
});

export const DEFAULT_BUCKET = 'assets';

/**
 * Uploads a file directly to the S3 assets bucket.
 */
export async function uploadToAssetsBucket(
  file: File | Blob | string,
  key: string,
  bucket: string = DEFAULT_BUCKET
) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file,
  });
  return await s3Client.send(command);
}

/**
 * Generates an expiring presigned view URL (expires in 1 hour).
 */
export async function getPresignedViewUrl(
  key: string,
  bucket: string = DEFAULT_BUCKET,
  expiresInSeconds: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}
