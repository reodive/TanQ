import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { hashPassword, signToken, stripPassword } from "@/lib/auth";
import { error } from "@/lib/http";

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    return error("入力内容が正しくありません", 422, { issues: parsed.error.flatten() });
  }
  const { name, email, password, role, schoolId, grade, tags } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return error("このメールアドレスは既に登録されています", 409);
  }
  if (schoolId) {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return error("指定した学校が見つかりません", 404);
    }
  }
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      schoolId,
      grade,
      tags,
      wallet: {
        create: {}
      }
    },
    include: {
      wallet: true
    }
  });
  const token = signToken({ sub: user.id, role: user.role, rank: user.rank });
  const safeUser = stripPassword(user);
  const res = NextResponse.json({ success: true, data: { user: safeUser, token } }, { status: 201 });
  res.cookies.set("tanq_token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7
  });
  return res;
}
