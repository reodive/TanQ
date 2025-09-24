import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, hashPassword, stripPassword } from "@/lib/auth";
import { SchoolPlan, BillingStatus, Role } from "@prisma/client";

const ALLOWED_ROLES: Role[] = ["student", "responder", "schoolAdmin", "sysAdmin"];
const guestEnabled = process.env.ENABLE_GUEST_ACCESS !== "false";

const roleLabel: Record<Role, string> = {
  student: "生徒",
  responder: "メンター",
  schoolAdmin: "学校管理者",
  sysAdmin: "システム管理者"
};

const guestSchoolName = "ゲストデモ校";

export async function POST(req: NextRequest) {
  if (!guestEnabled) {
    return NextResponse.json({ error: { message: "ゲストログインは無効化されています" } }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const requestedRole = typeof body?.role === "string" ? body.role : req.nextUrl.searchParams.get("role");
  const role = (ALLOWED_ROLES.includes(requestedRole as Role) ? requestedRole : "student") as Role;

  let targetSchoolId: string | null = null;
  if (role !== "sysAdmin") {
    let guestSchool = await prisma.school.findFirst({ where: { name: guestSchoolName } });

    if (!guestSchool) {
      guestSchool = await prisma.school.create({
        data: {
          name: guestSchoolName,
          plan: SchoolPlan.growth,
          seats: 50,
          billingStatus: BillingStatus.active
        }
      });
    } else {
      guestSchool = await prisma.school.update({
        where: { id: guestSchool.id },
        data: {
          billingStatus: BillingStatus.active,
          plan: SchoolPlan.growth
        }
      });
    }

    targetSchoolId = guestSchool.id;
  }

  const email = `guest+${role}@tanq.demo`;
  const passwordHash = await hashPassword("GuestDemo123!");

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role,
      schoolId: targetSchoolId,
      passwordHash
    },
    create: {
      name: `ゲスト（${roleLabel[role]}）`,
      email,
      passwordHash,
      role,
      schoolId: targetSchoolId
    }
  });

  const wallet = await prisma.creditWallet.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      balance: role === "sysAdmin" ? 0 : 20
    }
  });

  const token = signToken({ sub: user.id, role: user.role, rank: user.rank });
  const safeUser = stripPassword({ ...user, wallet });

  const redirectTo = role === "sysAdmin" ? "/admin/accounts" : "/dashboard";

  const res = NextResponse.json({ success: true, data: { user: safeUser, token, redirectTo } });
  res.cookies.set("tanq_token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 6
  });
  return res;
}
