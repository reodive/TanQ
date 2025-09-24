import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { conversationCreateSchema } from "@/lib/validators";
import { findOrCreateConversation } from "@/lib/chat";
import { error, json } from "@/lib/http";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.user || !ctx.payload) {
    return error("ログインが必要です", 401);
  }
  const requester = ctx.user;

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { userAId: requester.id },
        { userBId: requester.id }
      ]
    },
    include: {
      userA: {
        select: { id: true, name: true, role: true }
      },
      userB: {
        select: { id: true, name: true, role: true }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  return json({
    conversations: conversations.map((conversation) => {
      const otherParticipant = conversation.userAId === requester.id ? conversation.userB : conversation.userA;
      return {
        ...conversation,
        otherParticipant
      };
    })
  });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.user || !ctx.payload) {
    return error("ログインが必要です", 401);
  }
  const requester = ctx.user;
  const body = await req.json().catch(() => null);
  const parsed = conversationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return error("入力内容が正しくありません", 422, { issues: parsed.error.flatten() });
  }
  const { participantId } = parsed.data;
  if (participantId === requester.id) {
    return error("自分自身とはDMを作成できません", 400);
  }
  const participant = await prisma.user.findUnique({
    where: { id: participantId },
    select: { id: true, name: true, role: true }
  });
  if (!participant) {
    return error("指定したユーザーが見つかりません", 404);
  }
  const conversation = await findOrCreateConversation(requester.id, participantId);
  const hydrated = await prisma.conversation.findUnique({
    where: { id: conversation.id },
    include: {
      userA: {
        select: { id: true, name: true, role: true }
      },
      userB: {
        select: { id: true, name: true, role: true }
      }
    }
  });
  if (!hydrated) {
    return error("会話の取得に失敗しました", 500);
  }
  const otherParticipant = hydrated.userAId === requester.id ? hydrated.userB : hydrated.userA;
  return json({
    conversation: {
      ...hydrated,
      otherParticipant
    }
  }, 201);
}
