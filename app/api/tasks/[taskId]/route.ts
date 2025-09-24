import { NextRequest } from "next/server";
import { TaskStatus } from "@prisma/client";
import { parseISO, isValid } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { json, error } from "@/lib/http";
import { taskUpdateSchema } from "@/lib/validators";

function parseDueDate(input?: string | null) {
  if (input === null) return null;
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parsed = parseISO(trimmed);
  if (!isValid(parsed)) {
    throw new Error("INVALID_DATE");
  }
  return parsed;
}

export async function PATCH(req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload) {
    return error("ログインが必要です", 401);
  }

  const task = await prisma.task.findUnique({ where: { id: params.taskId } });
  if (!task || task.ownerId !== ctx.payload.sub) {
    return error("タスクが見つかりません", 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = taskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return error("入力内容が正しくありません", 422, {
      issues: parsed.error.flatten()
    });
  }

  let dueDateProcessed: Date | null | undefined = undefined;
  if (Object.prototype.hasOwnProperty.call(parsed.data, "dueDate")) {
    try {
      dueDateProcessed = parseDueDate(parsed.data.dueDate ?? null);
    } catch (err) {
      if (err instanceof Error && err.message == "INVALID_DATE") {
        return error("期限の日付形式が正しくありません", 400);
      }
      throw err;
    }
  }

  const updated = await prisma.task.update({
    where: { id: params.taskId },
    data: {
      title: parsed.data.title ?? task.title,
      status: (parsed.data.status as TaskStatus | undefined) ?? task.status,
      dueDate: dueDateProcessed === undefined ? task.dueDate : dueDateProcessed
    }
  });

  return json({ task: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload) {
    return error("ログインが必要です", 401);
  }

  const task = await prisma.task.findUnique({ where: { id: params.taskId } });
  if (!task || task.ownerId !== ctx.payload.sub) {
    return error("タスクが見つかりません", 404);
  }

  await prisma.task.delete({ where: { id: params.taskId } });
  return json({ success: true });
}
