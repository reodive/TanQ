import { NextRequest } from "next/server";
import { getAuthContextFromRequest, stripPassword } from "@/lib/auth";
import { json, error } from "@/lib/http";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.user) {
    return error("ログインが必要です", 401);
  }
  return json({ user: stripPassword(ctx.user) });
}
