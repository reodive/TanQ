import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { forumThreadSchema } from "@/lib/validators";
import { json, error } from "@/lib/http";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload) {
    return error("ログインが必要です", 401);
  }
  const url = new URL(req.url);
  const tag = url.searchParams.get("tag");
  const threads = await prisma.forumThread.findMany({
    where: tag ? { tags: { has: tag } } : undefined,
    include: {
      createdBy: true,
      posts: {
        orderBy: { createdAt: "asc" },
        take: 1
      }
    },
    orderBy: { createdAt: "desc" },
    take: 30
  });
  return json({ threads });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload) {
    return error("ログインが必要です", 401);
  }
  const payload = await req.json().catch(() => null);
  const parsed = forumThreadSchema.safeParse(payload);
  if (!parsed.success) {
    return error("入力内容が正しくありません", 422, { issues: parsed.error.flatten() });
  }
  const { title, tags, body } = parsed.data;
  const thread = await prisma.forumThread.create({
    data: {
      title,
      tags,
      createdById: ctx.payload.sub,
      posts: {
        create: {
          body,
          createdById: ctx.payload.sub
        }
      }
    },
    include: {
      posts: true
    }
  });
  return json({ thread }, 201);
}
