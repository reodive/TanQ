import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { google } from "googleapis";
import { parseISO, isValid } from "date-fns";
import { CalendarCredential } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
const STATE_SECRET = process.env.GOOGLE_STATE_SECRET ?? process.env.JWT_SECRET ?? "tanq-state-secret";

type GoogleCredentials = {
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string | null;
  token_type?: string | null;
  expiry_date?: number | null;
};

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/calendar/oauth/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_OAUTH_NOT_CONFIGURED");
  }

  return { clientId, clientSecret, redirectUri };
}

function createOAuthClient() {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig();
  return new google.auth.OAuth2({ clientId, clientSecret, redirectUri });
}

function buildStateToken(userId: string) {
  const nonce = randomBytes(16).toString("hex");
  const payload = JSON.stringify({ userId, nonce, ts: Date.now() });
  const encoded = Buffer.from(payload).toString("base64url");
  const hmac = createHmac("sha256", STATE_SECRET);
  hmac.update(encoded);
  const signature = hmac.digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyStateToken(state: string) {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) {
    return null;
  }
  const hmac = createHmac("sha256", STATE_SECRET);
  hmac.update(encoded);
  const expected = hmac.digest();
  const provided = Buffer.from(signature, "base64url");
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (typeof decoded?.userId === "string") {
      return decoded.userId as string;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildGoogleAuthUrl(userId: string) {
  const client = createOAuthClient();
  const state = buildStateToken(userId);
  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: CALENDAR_SCOPES,
    prompt: "consent",
    state
  });
  return { authUrl, state };
}

function normalizeTokens(tokens: GoogleCredentials, existing?: CalendarCredential) {
  const accessToken = tokens.access_token ?? existing?.accessToken;
  const refreshToken = tokens.refresh_token ?? existing?.refreshToken;
  if (!accessToken) {
    throw new Error("GOOGLE_OAUTH_MISSING_ACCESS_TOKEN");
  }
  if (!refreshToken) {
    throw new Error("GOOGLE_OAUTH_MISSING_REFRESH_TOKEN");
  }
  return {
    accessToken,
    refreshToken,
    scope: tokens.scope ?? existing?.scope ?? null,
    tokenType: tokens.token_type ?? existing?.tokenType ?? null,
    expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : existing?.expiryDate ?? null
  };
}

export async function upsertCalendarCredential(userId: string, tokens: GoogleCredentials) {
  const existing = await prisma.calendarCredential.findUnique({ where: { userId } });
  const normalized = normalizeTokens(tokens, existing ?? undefined);
  if (existing) {
    return prisma.calendarCredential.update({
      where: { userId },
      data: normalized
    });
  }
  return prisma.calendarCredential.create({
    data: {
      userId,
      ...normalized
    }
  });
}

async function ensureOAuthClient(credential: CalendarCredential) {
  const client = createOAuthClient();
  client.setCredentials({
    access_token: credential.accessToken,
    refresh_token: credential.refreshToken,
    scope: credential.scope ?? undefined,
    token_type: credential.tokenType ?? undefined,
    expiry_date: credential.expiryDate ? credential.expiryDate.getTime() : undefined
  });

  const shouldRefresh = !credential.expiryDate || credential.expiryDate.getTime() <= Date.now() + 60 * 1000;
  if (shouldRefresh) {
    const refreshResult = await client.refreshAccessToken();
    const refreshed = refreshResult.credentials as GoogleCredentials;
    const updated = await upsertCalendarCredential(credential.userId, refreshed);
    client.setCredentials({
      access_token: updated.accessToken,
      refresh_token: updated.refreshToken,
      scope: updated.scope ?? undefined,
      token_type: updated.tokenType ?? undefined,
      expiry_date: updated.expiryDate ? updated.expiryDate.getTime() : undefined
    });
    return { client, credential: updated };
  }

  return { client, credential };
}

function parseDate(input?: string | null) {
  if (!input) return null;
  const parsed = parseISO(input);
  return isValid(parsed) ? parsed : null;
}

export async function syncCalendarEvents(userId: string) {
  const credential = await prisma.calendarCredential.findUnique({ where: { userId } });
  if (!credential) {
    throw new Error("GOOGLE_OAUTH_NOT_CONNECTED");
  }

  const { client } = await ensureOAuthClient(credential);
  const calendar = google.calendar({ version: "v3", auth: client });

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults: 20,
    singleEvents: true,
    orderBy: "startTime"
  });

  const events = response.data.items ?? [];
  const keepIds: string[] = [];
  const now = new Date();

  const upserts = events
    .filter((event) => event.id)
    .map((event) => {
      const start = parseDate(event.start?.dateTime ?? event.start?.date ?? undefined);
      const end = parseDate(event.end?.dateTime ?? event.end?.date ?? undefined);
      const googleEventId = event.id as string;
      keepIds.push(googleEventId);
      return prisma.calendarEvent.upsert({
        where: {
          userId_googleEventId: {
            userId,
            googleEventId
          }
        },
        update: {
          summary: event.summary ?? null,
          description: event.description ?? null,
          htmlLink: event.htmlLink ?? null,
          calendarId: event.organizer?.email ?? null,
          startTime: start,
          endTime: end,
          syncedAt: now
        },
        create: {
          userId,
          googleEventId,
          summary: event.summary ?? null,
          description: event.description ?? null,
          htmlLink: event.htmlLink ?? null,
          calendarId: event.organizer?.email ?? null,
          startTime: start,
          endTime: end,
          syncedAt: now
        }
      });
    });

  if (upserts.length > 0) {
    await prisma.$transaction(upserts);
  }

  await prisma.calendarEvent.deleteMany({
    where: keepIds.length
      ? {
          userId,
          googleEventId: { notIn: keepIds }
        }
      : { userId }
  });

  return prisma.calendarEvent.findMany({
    where: { userId },
    orderBy: { startTime: "asc" }
  });
}

export async function getCalendarEvents(userId: string) {
  return prisma.calendarEvent.findMany({
    where: { userId },
    orderBy: { startTime: "asc" }
  });
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleCredentials> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens as GoogleCredentials;
}
