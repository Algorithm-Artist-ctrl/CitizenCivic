import "dotenv/config";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Configure S3 client with forcePathStyle: true
const s3 = new S3Client({
  forcePathStyle: true,
  // Automatically resolves AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_ENDPOINT_URL from environment
});

const bucket = process.env.AWS_STORAGE_BUCKET_NAME || "assets";
const key = "uploads/file.txt";

async function main() {
  console.log(`[s3] Connecting to bucket "${bucket}" with forcePathStyle: true...`);

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: "Hello World!",
      })
    );
    console.log(`[s3] Successfully put object "${key}" to bucket "${bucket}".`);

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 3600 }
    );
    console.log(`[view] ${url}`);
  } catch (err) {
    console.error(`[s3-error]`, err.message || err);
  }
}

main();
