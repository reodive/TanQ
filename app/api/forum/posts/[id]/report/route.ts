import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { json, error } from "@/lib/http";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload) {
    return error("ログインが必要です", 401);
  }
  const post = await prisma.forumPost.update({
    where: { id: params.id },
    data: {
      reports: { increment: 1 }
    }
  }).catch(() => null);
  if (!post) {
    return error("投稿が見つかりません", 404);
  }
  await prisma.auditLog.create({
    data: {
      actorId: ctx.payload.sub,
      action: "forum_post_report",
      entity: "ForumPost",
      entityId: params.id
    }
  });
  return json({ post });
}
