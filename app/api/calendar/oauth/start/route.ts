import { NextRequest } from "next/server";
import { getAuthContextFromRequest } from "@/lib/auth";
import { json, error } from "@/lib/http";
import { buildGoogleAuthUrl } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload) {
    return error("ログインが必要です", 401);
  }

  try {
    const { authUrl } = buildGoogleAuthUrl(ctx.payload.sub);
    return json({ authUrl });
  } catch (err) {
    if (err instanceof Error && err.message === "GOOGLE_OAUTH_NOT_CONFIGURED") {
      return error("Google OAuth の環境変数が設定されていません", 500);
    }
    throw err;
  }
}
