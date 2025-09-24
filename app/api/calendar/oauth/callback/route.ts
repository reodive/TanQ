import { NextRequest, NextResponse } from "next/server";
import { verifyStateToken, exchangeCodeForTokens, upsertCalendarCredential, syncCalendarEvents } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const redirectUrl = new URL("/dashboard/calendar", url.origin);
  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    redirectUrl.searchParams.set("error", oauthError);
    return NextResponse.redirect(redirectUrl);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    redirectUrl.searchParams.set("error", "missing_params");
    return NextResponse.redirect(redirectUrl);
  }

  const userId = verifyStateToken(state);
  if (!userId) {
    redirectUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await upsertCalendarCredential(userId, tokens);
    try {
      await syncCalendarEvents(userId);
      redirectUrl.searchParams.set("connected", "1");
    } catch (syncErr) {
      console.error("Failed to sync calendar events", syncErr);
      redirectUrl.searchParams.set("connected", "1");
      redirectUrl.searchParams.set("sync", "failed");
    }
  } catch (err) {
    console.error("Google OAuth callback failed", err);
    redirectUrl.searchParams.set("error", "oauth_failure");
  }

  return NextResponse.redirect(redirectUrl);
}
