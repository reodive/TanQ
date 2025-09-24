import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { ensureWallet } from "@/lib/credits";
import { json, error } from "@/lib/http";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload) {
    return error("認証が必要です", 401);
  }
  const wallet = await ensureWallet(ctx.payload.sub);
  const txns = await prisma.creditTxn.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  return json({ wallet: { ...wallet, txns } });
}
