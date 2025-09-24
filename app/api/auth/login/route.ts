import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";
import { signToken, verifyPassword, stripPassword } from "@/lib/auth";
import { error } from "@/lib/http";

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return error("入力内容が正しくありません", 422);
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email }, include: { wallet: true } });
  if (!user) {
    return error("メールアドレスまたはパスワードが違います", 401);
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return error("メールアドレスまたはパスワードが違います", 401);
  }
  const token = signToken({ sub: user.id, role: user.role, rank: user.rank });
  const safeUser = stripPassword(user);
  const res = NextResponse.json({ success: true, data: { user: safeUser, token } });
  res.cookies.set("tanq_token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7
  });
  return res;
}
