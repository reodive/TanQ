import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { json, error } from "@/lib/http";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload || ctx.payload.role !== "responder") {
    return error("回答者のみ利用できます", 403);
  }
  const question = await prisma.question.findFirst({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
    include: {
      student: true
    }
  });
  return json({ next: question });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload || ctx.payload.role !== "responder") {
    return error("回答者のみ利用できます", 403);
  }
  const question = await prisma.question.findFirst({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" }
  });
  if (!question) {
    return error("キューに質問がありません", 404);
  }
  const updated = await prisma.question.update({
    where: { id: question.id },
    data: {
      status: "assigned",
      assignedToId: ctx.payload.sub,
      assignedAt: new Date()
    }
  });
  return json({ assigned: updated });
}
