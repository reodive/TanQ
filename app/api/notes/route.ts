import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { json, error } from "@/lib/http";
import { noteSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload || !ctx.user) {
    return error("ログインが必要です", 401);
  }

  const { user } = ctx;
  const schoolId = user.schoolId ?? null;

  const notes = await prisma.note.findMany({
    where: schoolId
      ? {
          OR: [
            { schoolId },
            { schoolId: null },
            { createdById: user.id }
          ]
        }
      : {
          OR: [
            { schoolId: null },
            { createdById: user.id }
          ]
        },
    include: {
      createdBy: {
        select: { id: true, name: true }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  return json({ notes });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload || !ctx.user) {
    return error("ログインが必要です", 401);
  }

  const body = await req.json().catch(() => null);
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return error("入力内容が正しくありません", 422, {
      issues: parsed.error.flatten()
    });
  }

  const note = await prisma.note.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      createdById: ctx.user.id,
      schoolId: ctx.user.schoolId ?? null
    }
  });

  return json({ note }, 201);
}
