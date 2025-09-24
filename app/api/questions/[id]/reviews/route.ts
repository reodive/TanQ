import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { reviewSchema } from "@/lib/validators";
import { json, error } from "@/lib/http";
import { updateRankForUser } from "@/lib/rank";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload || ctx.payload.role !== "student") {
    return error("レビューを投稿できるのは生徒のみです", 403);
  }
  const question = await prisma.question.findUnique({
    where: { id: params.id },
    include: {
      answers: true
    }
  });
  if (!question) {
    return error("質問が見つかりません", 404);
  }
  if (question.studentId !== ctx.payload.sub) {
    return error("自分の質問にのみレビューできます", 403);
  }
  const payload = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(payload);
  if (!parsed.success) {
    return error("入力内容が正しくありません", 422, { issues: parsed.error.flatten() });
  }
  const { stars, comment, answerId } = parsed.data;
  const targetAnswer = answerId
    ? question.answers.find((a) => a.id === answerId)
    : question.answers[0];
  if (!targetAnswer) {
    return error("対象の回答が見つかりません", 404);
  }
  const existing = await prisma.review.findFirst({
    where: {
      answerId: targetAnswer.id,
      raterId: ctx.payload.sub
    }
  });
  if (existing) {
    return error("すでにレビュー済みです", 409);
  }
  const review = await prisma.review.create({
    data: {
      answerId: targetAnswer.id,
      raterId: ctx.payload.sub,
      stars,
      comment,
      questionId: params.id
    },
    include: {
      answer: true
    }
  });
  const stats = await prisma.review.aggregate({
    where: { answer: { responderId: targetAnswer.responderId } },
    _avg: { stars: true },
    _count: { _all: true }
  });
  await prisma.user.update({
    where: { id: targetAnswer.responderId },
    data: {
      ratingAvg: stats._avg.stars ?? 0,
      ratingCount: stats._count._all
    }
  });
  await updateRankForUser(targetAnswer.responderId);
  await prisma.question.update({
    where: { id: params.id },
    data: {
      status: "closed"
    }
  });
  return json({ review });
}
