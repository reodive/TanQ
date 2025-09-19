import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { purchaseSchema } from "@/lib/validators";
import { grantCredits } from "@/lib/credits";
import { json, error } from "@/lib/http";

export async function POST(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload) {
    return error("???????", 401);
  }
  const payload = await req.json().catch(() => null);
  const parsed = purchaseSchema.safeParse(payload);
  if (!parsed.success) {
    return error("????????????", 422, { issues: parsed.error.flatten() });
  }
  const { item, amountJpy, credits } = parsed.data;
  const targetSchoolId = ctx.user?.schoolId ?? null;
  const purchase = await prisma.purchase.create({
    data: {
      userId: ctx.user?.id,
      schoolId: item === "plan" ? targetSchoolId : null,
      item,
      amountJpy,
      credits,
      status: "completed",
      gatewayRef: `mock_${Date.now()}`,
      metadata: { note: "Mock gateway success" }
    }
  });
  if (item === "credits" && credits > 0 && ctx.user) {
    await grantCredits(ctx.user.id, credits, "???????", purchase.id);
  }
  if (item === "plan" && targetSchoolId) {
    await prisma.school.update({
      where: { id: targetSchoolId },
      data: {
        plan: "growth",
        billingStatus: "active"
      }
    });
  }
  return json({ purchase });
}
