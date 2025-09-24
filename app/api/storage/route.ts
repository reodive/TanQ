import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { json, error } from "@/lib/http";
import {
  buildResourceKey,
  createDownloadUrl,
  getMaxFileSizeBytes,
  getStorageProvider,
  isStorageConfigured,
  uploadObject
} from "@/lib/storage";
import { evaluateBadgesForUser } from "@/lib/badges";

const MAX_FILE_SIZE = getMaxFileSizeBytes();

export async function GET(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload || !ctx.user) {
    return error("ログインが必要です", 401);
  }

  if (!isStorageConfigured()) {
    return json({ files: [], storageEnabled: false });
  }

  const schoolId = ctx.user.schoolId ?? null;
  const orConditions: Prisma.ResourceFileWhereInput[] = [{ ownerId: ctx.user.id }];
  if (schoolId) {
    orConditions.push({ schoolId });
  }

  const files = await prisma.resourceFile.findMany({
    where: { OR: orConditions },
    include: {
      owner: {
        select: { id: true, name: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return json({ files, storageEnabled: true });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload || !ctx.user) {
    return error("ログインが必要です", 401);
  }

  if (!isStorageConfigured()) {
    return error("ストレージ接続が設定されていません", 503);
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return error("フォームデータが読み取れません", 400);
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return error("ファイルを選択してください", 422);
  }
  const descriptionRaw = formData.get("description");
  const description = typeof descriptionRaw === "string" && descriptionRaw.trim().length > 0 ? descriptionRaw.trim() : null;
  const scopeRaw = formData.get("scope");
  const scope = typeof scopeRaw === "string" ? scopeRaw : "personal";

  let schoolId: string | null = null;
  if (scope === "school") {
    if (!ctx.user.schoolId) {
      return error("学校に所属していないため共有できません", 400);
    }
    schoolId = ctx.user.schoolId;
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length === 0) {
    return error("空のファイルはアップロードできません", 422);
  }
  if (buffer.length > MAX_FILE_SIZE) {
    return error(`ファイルサイズが上限 (${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB) を超えています`, 413);
  }

  const originalName = file.name || "upload";
  const key = buildResourceKey(ctx.user.id, originalName, schoolId);
  await uploadObject({
    key,
    data: buffer,
    contentType: file.type || "application/octet-stream"
  });

  const resource = await prisma.resourceFile.create({
    data: {
      ownerId: ctx.user.id,
      schoolId,
      filename: originalName,
      objectKey: key,
      contentType: file.type || null,
      size: buffer.length,
      storageProvider: getStorageProvider(),
      description
    },
    include: {
      owner: {
        select: { id: true, name: true }
      }
    }
  });

  await evaluateBadgesForUser(ctx.user.id);
  const downloadUrl = await createDownloadUrl(resource.objectKey, 120);

  return json({ file: resource, downloadUrl }, 201);
}
