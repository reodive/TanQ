import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { json, error } from "@/lib/http";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload) {
    return error("ログインが必要です", 401);
  }
  const thread = await prisma.forumThread.findUnique({
    where: { id: params.id },
    include: {
      createdBy: true,
      posts: {
        orderBy: { createdAt: "asc" },
        include: {
          createdBy: true,
          replies: {
            include: {
              createdBy: true
            }
          }
        }
      }
    }
  });
  if (!thread) {
    return error("スレッドが見つかりません", 404);
  }
  return json({ thread });
}
