import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { error, json } from "@/lib/http";

export async function POST(req: NextRequest, { params }: { params: { noteId: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.user || !ctx.payload) {
    return error("ログインが必要です", 401);
  }

  const note = await prisma.note.findUnique({
    where: { id: params.noteId },
    include: {
      createdBy: {
        select: { id: true, name: true }
      }
    }
  });

  if (!note) {
    return error("ノートが見つかりません", 404);
  }

  const isSysAdmin = ctx.payload.role === "sysAdmin";
  const sameSchool = note.schoolId && ctx.user.schoolId === note.schoolId;
  const isOwner = note.createdById === ctx.user.id;

  if (!isSysAdmin && !sameSchool && !isOwner) {
    return error("このノートを通報する権限がありません", 403);
  }

  const updated = await prisma.note.update({
    where: { id: note.id },
    data: {
      reports: { increment: 1 }
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: ctx.user.id,
      action: "note_report",
      entity: "Note",
      entityId: note.id
    }
  });

  return json({ note: updated });
}
