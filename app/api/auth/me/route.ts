import { NextRequest } from "next/server";
import { getAuthContextFromRequest } from "@/lib/auth";
import { json, error } from "@/lib/http";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.user) {
    return error("???????", 401);
  }
  const { passwordHash: _hidden, ...safeUser } = ctx.user;
  return json({ user: safeUser });
}
