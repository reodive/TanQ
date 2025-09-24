import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { error, json } from "@/lib/http";

export async function POST(req: NextRequest, { params }: { params: { messageId: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.user || !ctx.payload) {
    return error("ログインが必要です", 401);
  }

  const message = await prisma.chatMessage.findUnique({
    where: { id: params.messageId },
    include: {
      conversation: {
        select: {
          id: true,
          userAId: true,
          userBId: true
        }
      },
      room: {
        select: {
          id: true,
          name: true,
          memberships: {
            where: { userId: ctx.user.id },
            select: { id: true }
          }
        }
      }
    }
  });

  if (!message) {
    return error("メッセージが見つかりません", 404);
  }

  const isSysAdmin = ctx.payload.role === "sysAdmin";

  if (message.conversationId) {
    const convo = message.conversation;
    if (!convo || (convo.userAId !== ctx.user.id && convo.userBId !== ctx.user.id)) {
      if (!isSysAdmin) {
        return error("このメッセージにアクセスできません", 403);
      }
    }
  } else if (message.roomId) {
    const membership = message.room?.memberships[0];
    if (!membership && !isSysAdmin) {
      return error("このメッセージにアクセスできません", 403);
    }
  }

  const updated = await prisma.chatMessage.update({
    where: { id: message.id },
    data: {
      reports: { increment: 1 }
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: ctx.user.id,
      action: "chat_message_report",
      entity: "ChatMessage",
      entityId: message.id,
      meta: {
        conversationId: message.conversationId,
        roomId: message.roomId
      }
    }
  });

  return json({ message: updated });
}
