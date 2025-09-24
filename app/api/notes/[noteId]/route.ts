import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { json, error } from "@/lib/http";
import { noteUpdateSchema } from "@/lib/validators";

async function ensureAccess(noteId: string, userId: string, schoolId: string | null) {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) return null;
  if (note.createdById === userId) return note;
  if (note.schoolId && note.schoolId === schoolId) return note;
  if (!note.schoolId) return note;
  return undefined;
}

export async function GET(req: NextRequest, { params }: { params: { noteId: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload || !ctx.user) {
    return error("ログインが必要です", 401);
  }

  const note = await prisma.note.findUnique({
    where: { id: params.noteId },
    include: {
      createdBy: { select: { id: true, name: true } }
    }
  });

  if (!note) {
    return error("ノートが見つかりません", 404);
  }

  const { id: userId, schoolId } = ctx.user;
  if (note.createdById !== userId) {
    if (note.schoolId) {
      if (note.schoolId !== schoolId) {
        return error("ノートにアクセスできません", 403);
      }
    }
  }

  return json({ note });
}

export async function PATCH(req: NextRequest, { params }: { params: { noteId: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload || !ctx.user) {
    return error("ログインが必要です", 401);
  }

  const note = await ensureAccess(params.noteId, ctx.user.id, ctx.user.schoolId ?? null);
  if (note === null) {
    return error("ノートが見つかりません", 404);
  }
  if (note === undefined) {
    return error("ノートにアクセスできません", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = noteUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return error("入力内容が正しくありません", 422, {
      issues: parsed.error.flatten()
    });
  }

  const updated = await prisma.note.update({
    where: { id: params.noteId },
    data: {
      title: parsed.data.title ?? note.title,
      content: parsed.data.content ?? note.content
    }
  });

  return json({ note: updated });
}
