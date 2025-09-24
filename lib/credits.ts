// lib/credits.ts - business logic to manage credit wallets and transactions
import { CreditTxnType } from "@prisma/client";
import { prisma } from "./prisma";
import { evaluateBadgesForUser } from "./badges";

export async function ensureWallet(userId: string) {
  const existing = await prisma.creditWallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.creditWallet.create({
    data: {
      userId,
      balance: 0
    }
  });
}

export async function adjustCredits(userId: string, delta: number, type: CreditTxnType, memo?: string, refId?: string) {
  const wallet = await ensureWallet(userId);
  const nextBalance = wallet.balance + delta;
  if (nextBalance < 0) {
    throw new Error("INSUFFICIENT_CREDITS");
  }
  const updated = await prisma.creditWallet.update({
    where: { id: wallet.id },
    data: {
      balance: nextBalance,
      txns: {
        create: {
          delta,
          type,
          memo,
          refId
        }
      }
    },
    include: {
      txns: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });
  await evaluateBadgesForUser(userId);
  return updated;
}

export async function consumeCredits(userId: string, amount: number, refId: string) {
  return adjustCredits(userId, -amount, CreditTxnType.debit, "質問投稿による消費", refId);
}

export async function grantCredits(userId: string, amount: number, memo: string, refId?: string) {
  return adjustCredits(userId, amount, CreditTxnType.credit, memo, refId);
}
