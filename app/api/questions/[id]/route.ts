import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { json, error } from "@/lib/http";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload) {
    return error("ログインが必要です", 401);
  }
  const question = await prisma.question.findUnique({
    where: { id: params.id },
    include: {
      student: true,
      assignedTo: true,
      answers: {
        include: {
          responder: true,
          reviews: true
        }
      },
      reviews: {
        include: {
          rater: true
        }
      }
    }
  });
  if (!question) {
    return error("質問が見つかりません", 404);
  }
  if (ctx.payload.role === "student" && question.studentId !== ctx.payload.sub) {
    return error("閲覧権限がありません", 403);
  }
  return json({ question });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload) {
    return error("ログインが必要です", 401);
  }
  const question = await prisma.question.findUnique({ where: { id: params.id } });
  if (!question) {
    return error("質問が見つかりません", 404);
  }
  const payload = await req.json().catch(() => ({}));
  const { status, assignedToId } = payload as { status?: string; assignedToId?: string };
  const updates: Record<string, unknown> = {};

  if (typeof status === "string") {
    if (status === "queued" || status === "draft") {
      if (ctx.payload.role !== "student" || question.studentId !== ctx.payload.sub) {
        return error("自分の質問のみ編集できます", 403);
      }
      updates.status = status;
    } else if (status === "assigned") {
      if (!["responder", "sysAdmin", "schoolAdmin"].includes(ctx.payload.role)) {
        return error("担当者のみ割り当てできます", 403);
      }
      const targetId = assignedToId && assignedToId !== "self" ? assignedToId : ctx.payload.sub;
      updates.assignedToId = targetId;
      updates.assignedAt = new Date();
      updates.status = "assigned";
    } else if (status === "closed") {
      const canClose = ctx.payload.role !== "student" || question.studentId === ctx.payload.sub;
      if (!canClose) {
        return error("この質問をクローズする権限がありません", 403);
      }
      updates.status = "closed";
    }
  }

  if (Object.keys(updates).length === 0) {
    return error("更新対象がありません", 400);
  }

  const updated = await prisma.question.update({
    where: { id: params.id },
    data: updates,
    include: {
      assignedTo: true,
      student: true
    }
  });
  return json({ question: updated });
}
