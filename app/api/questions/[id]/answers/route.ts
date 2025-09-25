import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { answerSchema } from "@/lib/validators";
import { json, error } from "@/lib/http";
import { evaluateBadgesForUser } from "@/lib/badges";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload || !["responder", "sysAdmin"].includes(ctx.payload.role)) {
    return error("回答権限がありません", 403);
  }
  const question = await prisma.question.findUnique({ include: { answers: true }, where: { id: params.id } });
  if (!question) {
    return error("質問が見つかりません", 404);
  }
  if (question.assignedToId && question.assignedToId !== ctx.payload.sub && ctx.payload.role !== "sysAdmin") {
    return error("この質問には別の回答者が割り当てられています", 403);
  }
  const payload = await req.json().catch(() => null);
  const parsed = answerSchema.safeParse(payload);
  if (!parsed.success) {
    return error("入力内容が正しくありません", 422, { issues: parsed.error.flatten() });
  }
  type QuestionWithAnswers = NonNullable<typeof question>;
  type AnswerForQuestion = QuestionWithAnswers["answers"][number];

  const existingAnswer = question.answers.find((answer: AnswerForQuestion) => answer.responderId === ctx.payload!.sub);
  if (existingAnswer) {
    return error("すでに回答済みです", 409);
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
  await evaluateBadgesForUser(ctx.payload.sub);
  return json({ answer });
}
