import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { directMessageSchema } from "@/lib/validators";
import { error, json } from "@/lib/http";
import { logDirectMessage } from "@/lib/chat";
import { emitNotificationMany } from "@/lib/realtime/notifications";
import type { RealtimeNotification } from "@/lib/realtime/types";

export async function GET(req: NextRequest, { params }: { params: { conversationId: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.user || !ctx.payload) {
    return error("ログインが必要です", 401);
  }
  const requester = ctx.user;
  const { conversationId } = params;
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) {
    return error("会話が見つかりません", 404);
  }
  if (conversation.userAId !== requester.id && conversation.userBId !== requester.id) {
    return error("この会話にアクセスする権限がありません", 403);
  }
  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    include: {
      sender: {
        select: { id: true, name: true, role: true }
      }
    },
    orderBy: { createdAt: "asc" },
    take: 200
  });
  return json({ messages });
}

export async function POST(req: NextRequest, { params }: { params: { conversationId: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.user || !ctx.payload) {
    return error("ログインが必要です", 401);
  }
  const requester = ctx.user;
  const { conversationId } = params;
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) {
    return error("会話が見つかりません", 404);
  }
  if (conversation.userAId !== requester.id && conversation.userBId !== requester.id) {
    return error("この会話にアクセスする権限がありません", 403);
  }
  const body = await req.json().catch(() => null);
  const parsed = directMessageSchema.safeParse(body);
  if (!parsed.success) {
    return error("入力内容が正しくありません", 422, { issues: parsed.error.flatten() });
  }
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.chatMessage.create({
      data: {
        conversationId,
        senderId: requester.id,
        body: parsed.data.body
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true }
        }
      }
    });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });
    return created;
  });

  await logDirectMessage({
    actorId: requester.id,
    conversationId,
    body: parsed.data.body
  });

  const targetUserIds = [conversation.userAId, conversation.userBId].filter((userId) => userId !== requester.id);
  if (targetUserIds.length > 0) {
    const notification: RealtimeNotification = {
      type: "direct_message",
      conversationId,
      messageId: message.id,
      body: message.body,
      sender: {
        id: message.sender.id,
        name: message.sender.name
      },
      createdAt: message.createdAt.toISOString()
    };
    emitNotificationMany(targetUserIds, notification);
  }

  return json({ message }, 201);
}
