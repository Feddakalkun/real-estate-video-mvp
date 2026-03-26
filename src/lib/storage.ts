import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const s3Endpoint = process.env.S3_ENDPOINT;
const s3Region = process.env.S3_REGION || "auto";
const s3Bucket = process.env.S3_BUCKET;
const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID;
const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const s3PublicBaseUrl = process.env.S3_PUBLIC_BASE_URL;

const hasS3 =
  Boolean(s3Endpoint) &&
  Boolean(s3Bucket) &&
  Boolean(s3AccessKeyId) &&
  Boolean(s3SecretAccessKey) &&
  Boolean(s3PublicBaseUrl);

const s3Client = hasS3
  ? new S3Client({
      region: s3Region,
      endpoint: s3Endpoint,
      credentials: {
        accessKeyId: s3AccessKeyId as string,
        secretAccessKey: s3SecretAccessKey as string,
      },
      forcePathStyle: false,
    })
  : null;

function sanitizeMimeType(input: string) {
  if (!input) return "application/octet-stream";
  return input.toLowerCase();
}

export async function uploadBuffer(params: {
  folder: "inputs" | "outputs";
  buffer: Buffer;
  contentType: string;
  extension: string;
}) {
  const { folder, buffer, contentType, extension } = params;
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  const key = `${folder}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${ext}`;

  if (s3Client && s3Bucket && s3PublicBaseUrl) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: s3Bucket,
        Key: key,
        Body: buffer,
        ContentType: sanitizeMimeType(contentType),
      }),
    );

    return {
      storageKey: key,
      url: `${s3PublicBaseUrl.replace(/\/$/, "")}/${key}`,
    };
  }

  const localFilePath = path.join(process.cwd(), "public", "storage", key);
  await fs.mkdir(path.dirname(localFilePath), { recursive: true });
  await fs.writeFile(localFilePath, buffer);

  return {
    storageKey: key,
    url: `/storage/${key}`,
  };
}
