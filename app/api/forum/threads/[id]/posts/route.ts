import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { forumPostSchema } from "@/lib/validators";
import { json, error } from "@/lib/http";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload) {
    return error("???????", 401);
  }
  const thread = await prisma.forumThread.findUnique({ where: { id: params.id } });
  if (!thread) {
    return error("????????????", 404);
  }
  const payload = await req.json().catch(() => null);
  const parsed = forumPostSchema.safeParse(payload);
  if (!parsed.success) {
    return error("?????????????", 422, { issues: parsed.error.flatten() });
  }
  const { body, parentPostId } = parsed.data;
  if (parentPostId) {
    const parent = await prisma.forumPost.findUnique({ where: { id: parentPostId } });
    if (!parent || parent.threadId !== params.id) {
      return error("???????????????", 404);
    }
  }
  const post = await prisma.forumPost.create({
    data: {
      threadId: params.id,
      body,
      parentPostId,
      createdById: ctx.payload.sub
    },
    include: {
      createdBy: true
    }
  });
  return json({ post }, 201);
}
