import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { error, json } from "@/lib/http";

export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.user || !ctx.payload) {
    return error("ログインが必要です", 401);
  }
  const { roomId } = params;
  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room) {
    return error("指定した部屋が見つかりません", 404);
  }
  const existing = await prisma.chatRoomMembership.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId: ctx.user.id
      }
    }
  });
  if (existing) {
    return json({ membership: existing });
  }
  const membership = await prisma.chatRoomMembership.create({
    data: {
      roomId,
      userId: ctx.user.id,
      autoJoined: false
    }
  });
  return json({ membership }, 201);
}
