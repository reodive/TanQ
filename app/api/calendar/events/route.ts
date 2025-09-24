import { NextRequest } from "next/server";
import { getAuthContextFromRequest } from "@/lib/auth";
import { json, error } from "@/lib/http";
import { getCalendarEvents } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload) {
    return error("ログインが必要です", 401);
  }

  const events = await getCalendarEvents(ctx.payload.sub);
  return json({ events });
}
