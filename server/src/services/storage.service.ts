import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';

const hasS3Config = Boolean(
  config.awsAccessKeyId &&
  config.awsSecretAccessKey &&
  config.awsBucket
);

let s3Client: S3Client | null = null;

if (hasS3Config) {
  try {
    s3Client = new S3Client({
      region: config.awsRegion,
      endpoint: config.awsEndpointUrl || undefined,
      forcePathStyle: config.awsS3ForcePathStyle,
      credentials: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey,
      },
    });
    console.log(`[storage] S3 storage client initialized (bucket: ${config.awsBucket})`);
  } catch (err: any) {
    console.warn(`[storage] S3 initialization failed, falling back to local disk:`, err.message);
    s3Client = null;
  }
} else {
  console.log(`[storage] S3 credentials not provided. Using secure local disk storage at ${config.uploadDir}`);
}

// Multer memory storage for direct streaming/routing
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

export async function saveFile(
  file: Express.Multer.File,
  prefix = 'evidence'
): Promise<{ key: string; url: string }> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  const ext = path.extname(file.originalname) || '.jpg';
  const randomName = `${crypto.randomUUID()}${ext}`;
  const relativeKey = `${prefix}/${year}/${month}/${day}/${randomName}`;

  if (s3Client) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: config.awsBucket,
          Key: relativeKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      const presignedUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: config.awsBucket,
          Key: relativeKey,
        }),
        { expiresIn: 3600 * 24 } // 24 hours
      );

      return { key: relativeKey, url: presignedUrl };
    } catch (s3Error: any) {
      console.warn('[storage] S3 upload error, falling back to local disk:', s3Error.message);
    }
  }

  // Local storage fallback
  const localTargetDir = path.join(config.uploadDir, prefix, String(year), month, day);
  fs.mkdirSync(localTargetDir, { recursive: true });
  
  const fullLocalPath = path.join(localTargetDir, randomName);
  fs.writeFileSync(fullLocalPath, file.buffer);

  // Return standard relative key compatible with Django upload_to='evidence/%Y/%m/%d/'
  return {
    key: relativeKey,
    url: `/media/${relativeKey}`,
  };
}

export async function getFileViewUrl(key: string): Promise<string> {
  if (!key) return '';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;

  if (s3Client) {
    try {
      return await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: config.awsBucket,
          Key: key,
        }),
        { expiresIn: 3600 * 24 }
      );
    } catch {
      // Fallback
    }
  }

  return `/media/${key.replace(/^\/+/, '')}`;
}
