import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { chatMessageSchema } from "@/lib/validators";
import { error, json } from "@/lib/http";

export async function GET(req: NextRequest, { params }: { params: { roomId: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.user || !ctx.payload) {
    return error("ログインが必要です", 401);
  }
  const { roomId } = params;
  const membership = await prisma.chatRoomMembership.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId: ctx.user.id
      }
    }
  });
  if (!membership) {
    return error("部屋に参加していません", 403);
  }
  const messages = await prisma.chatMessage.findMany({
    where: { roomId },
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

export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.user || !ctx.payload) {
    return error("ログインが必要です", 401);
  }
  const { roomId } = params;
  const membership = await prisma.chatRoomMembership.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId: ctx.user.id
      }
    }
  });
  if (!membership) {
    return error("部屋に参加していません", 403);
  }
  const body = await req.json().catch(() => null);
  const parsed = chatMessageSchema.safeParse(body);
  if (!parsed.success) {
    return error("入力内容が正しくありません", 422, { issues: parsed.error.flatten() });
  }
  const message = await prisma.chatMessage.create({
    data: {
      roomId,
      senderId: ctx.user.id,
      body: parsed.data.body
    },
    include: {
      sender: {
        select: { id: true, name: true, role: true }
      }
    }
  });
  return json({ message }, 201);
}
