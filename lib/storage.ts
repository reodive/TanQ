import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const STORAGE_BUCKET = process.env.STORAGE_BUCKET ?? process.env.S3_BUCKET;
const STORAGE_REGION = process.env.STORAGE_REGION ?? process.env.S3_REGION ?? "ap-northeast-1";
const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT ?? process.env.S3_ENDPOINT;
const STORAGE_ACCESS_KEY_ID = process.env.STORAGE_ACCESS_KEY_ID ?? process.env.S3_ACCESS_KEY_ID;
const STORAGE_SECRET_ACCESS_KEY = process.env.STORAGE_SECRET_ACCESS_KEY ?? process.env.S3_SECRET_ACCESS_KEY;
const STORAGE_FORCE_PATH_STYLE = (process.env.STORAGE_FORCE_PATH_STYLE ?? process.env.S3_FORCE_PATH_STYLE ?? "false").toLowerCase() === "true";
const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER ?? "s3";
const DEFAULT_MAX_FILE_SIZE = 15 * 1024 * 1024;
const configuredSize = Number.parseInt(process.env.STORAGE_MAX_FILE_SIZE ?? "0", 10);
const MAX_FILE_SIZE = Number.isNaN(configuredSize) || configuredSize <= 0 ? DEFAULT_MAX_FILE_SIZE : configuredSize;

let cachedClient: S3Client | null = null;

export function isStorageConfigured(): boolean {
  return Boolean(STORAGE_BUCKET && STORAGE_ACCESS_KEY_ID && STORAGE_SECRET_ACCESS_KEY);
}

function getClient(): S3Client {
  if (!isStorageConfigured()) {
    throw new Error("STORAGE_NOT_CONFIGURED");
  }
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: STORAGE_REGION,
      credentials: {
        accessKeyId: STORAGE_ACCESS_KEY_ID!,
        secretAccessKey: STORAGE_SECRET_ACCESS_KEY!
      },
      endpoint: STORAGE_ENDPOINT,
      forcePathStyle: STORAGE_FORCE_PATH_STYLE
    });
  }
  return cachedClient;
}

export function getStorageProvider(): string {
  return STORAGE_PROVIDER;
}

export function getMaxFileSizeBytes(): number {
  return MAX_FILE_SIZE;
}

export function sanitizeFilename(filename: string): string {
  const normalized = filename.normalize("NFKD").replace(/[\s]+/g, "-");
  const cleaned = normalized.replace(/[^a-zA-Z0-9_.-]/g, "-");
  return cleaned.replace(/-+/g, "-").replace(/(^-|-$)/g, "").slice(0, 120) || "file";
}

export function buildResourceKey(userId: string, filename: string, schoolId?: string | null): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const ownerSegment = userId.slice(0, 8);
  const schoolSegment = schoolId ?? "solo";
  const safeName = sanitizeFilename(filename);
  return `resources/${schoolSegment}/${ownerSegment}/${ts}-${safeName}`;
}

export async function uploadObject(params: { key: string; data: Buffer; contentType?: string }) {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: STORAGE_BUCKET!,
      Key: params.key,
      Body: params.data,
      ContentType: params.contentType ?? "application/octet-stream"
    })
  );
}

export async function deleteObject(key: string) {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: STORAGE_BUCKET!,
      Key: key
    })
  );
}

export async function createDownloadUrl(key: string, expiresInSeconds = 60) {
  const client = getClient();
  const command = new GetObjectCommand({
    Bucket: STORAGE_BUCKET!,
    Key: key
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
