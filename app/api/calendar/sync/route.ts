import { NextRequest } from "next/server";
import { getAuthContextFromRequest } from "@/lib/auth";
import { json, error } from "@/lib/http";
import { syncCalendarEvents } from "@/lib/google-calendar";

export async function POST(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload) {
    return error("ログインが必要です", 401);
  }

  try {
    const events = await syncCalendarEvents(ctx.payload.sub);
    return json({ events });
  } catch (err) {
    if (err instanceof Error && err.message === "GOOGLE_OAUTH_NOT_CONNECTED") {
      return error("Google カレンダーと連携されていません", 404);
    }
    console.error("Calendar sync failed", err);
    return error("カレンダーの同期に失敗しました", 500);
  }
}
