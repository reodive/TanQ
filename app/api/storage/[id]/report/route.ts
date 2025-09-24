import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { error, json } from "@/lib/http";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.user || !ctx.payload) {
    return error("ログインが必要です", 401);
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
    return error("ファイルが見つかりません", 404);
  }

  const isSysAdmin = ctx.payload.role === "sysAdmin";
  const sameSchool = resource.schoolId && ctx.user.schoolId === resource.schoolId;
  const isOwner = resource.ownerId === ctx.user.id;

  if (!isSysAdmin && !sameSchool && !isOwner) {
    return error("このファイルを通報する権限がありません", 403);
  }

  const updated = await prisma.resourceFile.update({
    where: { id: resource.id },
    data: {
      reports: { increment: 1 }
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: ctx.user.id,
      action: "resource_report",
      entity: "ResourceFile",
      entityId: resource.id
    }
  });

  return json({ resource: updated });
}
