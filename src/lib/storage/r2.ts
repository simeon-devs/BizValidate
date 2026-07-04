import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

// R2 is S3-compatible; objects are private and read back server-side
// (no public bucket URL needed). fileUrl values stored on submissions
// use the form r2://<bucket>/<key>.
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export function toFileUrl(key: string): string {
  return `r2://${env.R2_BUCKET_NAME}/${key}`;
}

export function fromFileUrl(fileUrl: string): string {
  return fileUrl.replace(`r2://${env.R2_BUCKET_NAME}/`, "");
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return toFileUrl(key);
}

export async function getObject(key: string): Promise<Buffer> {
  const result = await r2.send(
    new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
  );
  const bytes = await result.Body?.transformToByteArray();
  if (!bytes) throw new Error(`Empty object at ${key}`);
  return Buffer.from(bytes);
}

export async function deleteObject(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
  );
}
