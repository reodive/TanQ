import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { json, error } from "@/lib/http";
import { createDownloadUrl, isStorageConfigured } from "@/lib/storage";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload || !ctx.user) {
    return error("ログインが必要です", 401);
  }

  if (!isStorageConfigured()) {
    return error("ストレージ接続が設定されていません", 503);
  }

  const resource = await prisma.resourceFile.findUnique({
    where: { id: params.id },
    include: {
      owner: {
        select: { id: true, name: true }
      }
    }
  });
  if (!resource) {
    return error("資料が見つかりません", 404);
  }

  const isOwner = resource.ownerId === ctx.user.id;
  const sameSchool = resource.schoolId && ctx.user.schoolId && resource.schoolId === ctx.user.schoolId;
  const isSystemAdmin = ctx.payload.role === "sysAdmin";

  if (!isOwner && !isSystemAdmin && !sameSchool) {
    return error("閲覧権限がありません", 403);
  }

  const url = await createDownloadUrl(resource.objectKey, 120);
  return json({ url, filename: resource.filename, contentType: resource.contentType });
}
