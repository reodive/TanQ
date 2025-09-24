import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { questionSchema } from "@/lib/validators";
import { runAiCheck } from "@/lib/aiCheck";
import { consumeCredits } from "@/lib/credits";
import { evaluateBadgesForUser } from "@/lib/badges";
import { json, error } from "@/lib/http";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload) {
    return error("ログインが必要です", 401);
  }
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (status) {
    where.status = status;
  }
  if (ctx.payload.role === "student") {
    where.studentId = ctx.payload.sub;
  } else if (ctx.payload.role === "responder") {
    where.OR = [
      { status: "queued" },
      { assignedToId: ctx.payload.sub }
    ];
  }
  const questions = await prisma.question.findMany({
    where,
    include: {
      student: true,
      assignedTo: true,
      answers: {
        include: {
          responder: true,
          reviews: true
        }
      },
      reviews: true
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  return json({ questions });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload || ctx.payload.role !== "student") {
    return error("質問を投稿できるのは生徒のみです", 403);
  }
  const body = await req.json().catch(() => null);
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return error("入力内容が正しくありません", 422, { issues: parsed.error.flatten() });
  }
  const { title, body: questionBody, tags, status } = parsed.data;
  const aiResult = runAiCheck({ title, body: questionBody });
  if (status === "queued" && !aiResult.passed) {
    return error("AI チェックを通過していません", 400, { issues: aiResult.issues });
  }
  const creditCost = aiResult.creditMultiplier;
  let creditRef: string | null = null;
  if (status === "queued") {
    creditRef = `question:${Date.now()}`;
    try {
      await consumeCredits(ctx.payload.sub, creditCost, creditRef);
    } catch (err) {
      if (err instanceof Error && err.message === "INSUFFICIENT_CREDITS") {
        return error("クレジット残高が不足しています", 402);
      }
      throw err;
    }
  }
  const question = await prisma.question.create({
    data: {
      studentId: ctx.payload.sub,
      title,
      body: questionBody,
      tags,
      charCount: aiResult.charCount,
      creditCost,
      status,
      aiCheckPassed: aiResult.passed,
      aiFeedback: aiResult.issues.join("\n") || null
    }
  });
  await evaluateBadgesForUser(ctx.payload.sub);
  return json({ question, aiResult, creditRef });
}
