import { Prisma, Badge, UserBadge } from "@prisma/client";
import { prisma } from "./prisma";
import { emitNotification } from "./realtime/notifications";
import type { RealtimeNotification } from "./realtime/types";

export type BadgeRuleContext = {
  userId: string;
  questionCount: number;
  resourceCount: number;
  answerCount: number;
  walletBalance: number;
  earnedCodes: Set<string>;
};

type BadgeRule = {
  code: string;
  evaluate: (context: BadgeRuleContext) => string | null | Promise<string | null>;
};

const BADGE_RULES: BadgeRule[] = [
  {
    code: "first_question",
    evaluate: (ctx) => (ctx.questionCount > 0 ? "はじめての質問投稿を達成しました" : null)
  },
  {
    code: "first_upload",
    evaluate: (ctx) => (ctx.resourceCount > 0 ? "共有スペースに最初の資料をアップロードしました" : null)
  },
  {
    code: "credit_saver",
    evaluate: (ctx) => (ctx.walletBalance >= 100 ? "ウォレット残高が100ptを超えました" : null)
  },
  {
    code: "mentor_helper",
    evaluate: (ctx) => (ctx.answerCount >= 5 ? "回答を5件以上投稿しました" : null)
  }
];

export async function evaluateBadgesForUser(userId: string): Promise<Array<UserBadge & { badge: Badge }>> {
  const [questionCount, resourceCount, answerCount, wallet, existingAwards] = await Promise.all([
    prisma.question.count({ where: { studentId: userId } }),
    prisma.resourceFile.count({ where: { ownerId: userId } }),
    prisma.answer.count({ where: { responderId: userId } }),
    prisma.creditWallet.findUnique({ where: { userId } }),
    prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true }
    })
  ]);

  const earnedCodes = new Set(existingAwards.map((award) => award.badge.code));
  const context: BadgeRuleContext = {
    userId,
    questionCount,
    resourceCount,
    answerCount,
    walletBalance: wallet?.balance ?? 0,
    earnedCodes
  };

  const newlyAwarded: Array<UserBadge & { badge: Badge }> = [];

  for (const rule of BADGE_RULES) {
    if (context.earnedCodes.has(rule.code)) continue;
    const reason = await rule.evaluate(context);
    if (!reason) continue;
    const badge = await prisma.badge.findUnique({ where: { code: rule.code } });
    if (!badge) {
      continue;
    }
    try {
      const award = await prisma.userBadge.create({
        data: {
          userId,
          badgeId: badge.id,
          reason
        },
        include: {
          badge: true
        }
      });
      newlyAwarded.push(award);
      context.earnedCodes.add(rule.code);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        continue;
      }
      throw err;
    }
  }

  if (newlyAwarded.length > 0) {
    for (const award of newlyAwarded) {
      const event: RealtimeNotification = {
        type: "badge_awarded",
        awardId: award.id,
        badge: {
          code: award.badge.code,
          name: award.badge.name,
          description: award.badge.description
        },
        reason: award.reason,
        awardedAt: award.awardedAt.toISOString()
      };
      emitNotification(userId, event);
    }
  }

  return newlyAwarded;
}
