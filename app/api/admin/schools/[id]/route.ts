import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { json, error } from "@/lib/http";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload) {
    return error("???????", 401);
  }
  const isSysAdmin = ctx.payload.role === "sysAdmin";
  const isOwnSchool = ctx.payload.role === "schoolAdmin" && ctx.user?.schoolId === params.id;
  if (!isSysAdmin && !isOwnSchool) {
    return error("??????????", 403);
  }
  const school = await prisma.school.findUnique({
    where: { id: params.id },
    include: {
      users: true,
      purchases: {
        orderBy: { createdAt: "desc" },
        take: 10
      }
    }
  });
  if (!school) {
    return error("??????????", 404);
  }
  return json({ school });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload) {
    return error("???????", 401);
  }
  const allowed = ctx.payload.role === "sysAdmin" || (ctx.payload.role === "schoolAdmin" && ctx.user?.schoolId === params.id);
  if (!allowed) {
    return error("??????????", 403);
  }
  const changes = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof changes.plan === "string") {
    data.plan = changes.plan;
  }
  if (typeof changes.billingStatus === "string") {
    data.billingStatus = changes.billingStatus;
  }
  if (typeof changes.seats === "number") {
    data.seats = changes.seats;
  }
  if (Object.keys(data).length === 0) {
    return error("?????????", 400);
  }
  const school = await prisma.school.update({
    where: { id: params.id },
    data
  });
  return json({ school });
}
