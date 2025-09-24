import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { json, error } from "@/lib/http";
import { deleteObject, isStorageConfigured } from "@/lib/storage";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload || !ctx.user) {
    return error("ログインが必要です", 401);
  }

  if (!isStorageConfigured()) {
    return error("ストレージ接続が設定されていません", 503);
  }

  const resource = await prisma.resourceFile.findUnique({ where: { id: params.id } });
  if (!resource) {
    return error("資料が見つかりません", 404);
  }

  const isOwner = resource.ownerId === ctx.user.id;
  const isSameSchool = resource.schoolId && ctx.user.schoolId && resource.schoolId === ctx.user.schoolId;
  const isSystemAdmin = ctx.payload.role === "sysAdmin";
  const isSchoolAdmin = ctx.payload.role === "schoolAdmin" && isSameSchool;

  if (!isOwner && !isSystemAdmin && !isSchoolAdmin) {
    return error("削除権限がありません", 403);
  }

  await deleteObject(resource.objectKey);
  await prisma.resourceFile.delete({ where: { id: resource.id } });

  return json({ deleted: true });
}
