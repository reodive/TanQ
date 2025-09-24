// サーバー側で認証済みユーザーを取得するユーティリティ。
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function getCurrentUser() {
  const token = cookies().get("tanq_token")?.value;
  const payload = verifyToken(token);
  if (!payload) return null;
  return prisma.user.findUnique({
    where: { id: payload.sub },
    include: {
      school: true,
      wallet: true
    }
  });
}
