import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { json, error } from "@/lib/http";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload || ctx.payload.role !== "sysAdmin") {
    return error("??????????", 403);
  }
  const reports = await prisma.forumPost.findMany({
    where: { reports: { gt: 0 } },
    orderBy: { reports: "desc" },
    take: 50,
    include: {
      createdBy: true,
      thread: true
    }
  });
  return json({ reports });
}

export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload || ctx.payload.role !== "sysAdmin") {
    return error("??????????", 403);
  }
  const payload = await req.json().catch(() => ({}));
  const { postId, action } = payload as { postId?: string; action?: "dismiss" | "remove" };
  if (!postId || !action) {
    return error("???????", 400);
  }
  if (action === "dismiss") {
    await prisma.forumPost.update({
      where: { id: postId },
      data: { reports: 0 }
    });
  } else if (action === "remove") {
    await prisma.forumPost.delete({ where: { id: postId } });
  }
  await prisma.auditLog.create({
    data: {
      actorId: ctx.payload.sub,
      action: `moderation_${action}`,
      entity: "ForumPost",
      entityId: postId
    }
  });
  return json({ ok: true });
}
