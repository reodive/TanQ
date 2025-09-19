import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { answerSchema } from "@/lib/validators";
import { json, error } from "@/lib/http";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload || !["responder", "sysAdmin"].includes(ctx.payload.role)) {
    return error("??????????", 403);
  }
  const question = await prisma.question.findUnique({ include: { answers: true }, where: { id: params.id } });
  if (!question) {
    return error("??????????", 404);
  }
  if (question.assignedToId && question.assignedToId !== ctx.payload.sub && ctx.payload.role !== "sysAdmin") {
    return error("??????????????", 403);
  }
  const payload = await req.json().catch(() => null);
  const parsed = answerSchema.safeParse(payload);
  if (!parsed.success) {
    return error("?????????????", 422, { issues: parsed.error.flatten() });
  }
  const existingAnswer = question.answers.find((a) => a.responderId === ctx.payload!.sub);
  if (existingAnswer) {
    return error("?????????", 409);
  }
  const answer = await prisma.answer.create({
    data: {
      questionId: params.id,
      responderId: ctx.payload.sub,
      body: parsed.data.body
    },
    include: {
      responder: true
    }
  });
  await prisma.question.update({
    where: { id: params.id },
    data: {
      status: "answered",
      answeredAt: new Date(),
      assignedToId: ctx.payload.sub
    }
  });
  return json({ answer });
}
