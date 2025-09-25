import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, hashPassword } from "@/lib/auth";

type RoleValue = "student" | "responder" | "schoolAdmin" | "sysAdmin";
type SchoolPlanValue = "free" | "starter" | "growth" | "enterprise";
type BillingStatusValue = "trial" | "active" | "delinquent" | "suspended" | "cancelled";

const ALLOWED_ROLES: RoleValue[] = ["student", "responder", "schoolAdmin", "sysAdmin"];
const guestEnabled = process.env.ENABLE_GUEST_ACCESS !== "false";

const roleLabel: Record<RoleValue, string> = {
  student: "生徒",
  responder: "メンター",
  schoolAdmin: "学校管理者",
  sysAdmin: "システム管理者"
};

const guestSchoolName = "ゲストデモ校";
const guestPlan: SchoolPlanValue = "growth";
const guestBillingStatus: BillingStatusValue = "active";

export async function POST(req: NextRequest) {
  try {
    if (!guestEnabled) {
      return NextResponse.json(
        { error: { message: "ゲストログインは無効化されています" } },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const requestedRole =
      typeof body?.role === "string" ? body.role : req.nextUrl.searchParams.get("role");
    const role = (ALLOWED_ROLES.includes(requestedRole as RoleValue)
      ? requestedRole
      : "student") as RoleValue;

    let targetSchoolId: string | null = null;
    if (role !== "sysAdmin") {
      let guestSchool = await prisma.school.findFirst({
        where: { name: guestSchoolName }
      });
      if (!guestSchool) {
        guestSchool = await prisma.school.create({
          data: {
            name: guestSchoolName,
            plan: guestPlan,
            seats: 50,
            billingStatus: guestBillingStatus
          }
        });
      } else {
        guestSchool = await prisma.school.update({
          where: { id: guestSchool.id },
          data: { billingStatus: guestBillingStatus, plan: guestPlan }
        });
      }
      targetSchoolId = guestSchool.id;
    }

    const email = `guest+${role}@tanq.demo`;
    const passwordHash = await hashPassword("GuestDemo123!");
    const user = await prisma.user.upsert({
      where: { email },
      update: { role, schoolId: targetSchoolId, passwordHash },
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
      create: { userId: user.id, balance: role === "sysAdmin" ? 0 : 20 }
    });

    const token = signToken({ sub: user.id, role: user.role, rank: user.rank });
    // Prismaオブジェクトをそのまま返すとJSON化で失敗するため、必要なフィールドだけを整形
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      rank: user.rank,
      schoolId: user.schoolId,
      wallet: wallet
        ? {
            id: wallet.id,
            balance: wallet.balance,
            updatedAt: wallet.updatedAt.toISOString(),
          }
        : null,
    };
    const redirectTo: string = role === "sysAdmin" ? "/admin/accounts" : "/dashboard";

    const res = NextResponse.json({
      success: true,
      data: { user: safeUser, token: token || "", redirectTo: redirectTo || "/dashboard" }
    });
    res.cookies.set("tanq_token", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 6
    });
    return res;
  } catch (err) {
    console.error("Guest login error:", err);
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : "予期しないサーバーエラー" } },
      { status: 500 }
    );
  }
}