import { NextRequest } from "next/server";
import { TaskStatus } from "@prisma/client";
import { parseISO, isValid } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { json, error } from "@/lib/http";
import { taskCreateSchema } from "@/lib/validators";

function parseDueDate(input?: string | null) {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parsed = parseISO(trimmed);
  if (!isValid(parsed)) {
    throw new Error("INVALID_DATE");
  }
  return parsed;
}

export async function GET(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload) {
    return error("ログインが必要です", 401);
  }

  const tasks = await prisma.task.findMany({
    where: { ownerId: ctx.payload.sub },
    orderBy: [
      { status: "asc" },
      { dueDate: "asc" },
      { createdAt: "asc" }
    ]
  });

  return json({ tasks });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload) {
    return error("ログインが必要です", 401);
  }

  const body = await req.json().catch(() => null);
  const parsed = taskCreateSchema.safeParse(body);
  if (!parsed.success) {
    return error("入力内容が正しくありません", 422, {
      issues: parsed.error.flatten()
    });
  }

  let dueDate: Date | null = null;
  try {
    dueDate = parseDueDate(parsed.data.dueDate);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_DATE") {
      return error("期限の日付形式が正しくありません", 400);
    }
    throw err;
  }

  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      status: parsed.data.status as TaskStatus,
      dueDate,
      ownerId: ctx.payload.sub
    }
  });

  return json({ task }, 201);
}
