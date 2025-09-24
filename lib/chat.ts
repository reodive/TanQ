import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function deriveRoomSlug(name: string, fallback?: string) {
  const base = fallback ?? slugify(name);
  return base || `room-${Date.now()}`;
}

type AutoJoinUser = Pick<User, "id" | "schoolId" | "grade"> & { tags: string[] };

export async function ensureAutoMemberships(user: AutoJoinUser) {
  const userTags = user.tags ?? [];
  const candidateRooms = await prisma.chatRoom.findMany({
    where: {
      AND: [
        {
          OR: [
            { schoolId: null },
            ...(user.schoolId ? [{ schoolId: user.schoolId }] : [])
          ]
        },
        {
          OR: [
            { grade: null },
            ...(user.grade ? [{ grade: user.grade }] : [])
          ]
        },
        userTags.length === 0
          ? {
              OR: [{ tags: { equals: [] } }]
            }
          : {
              OR: [
                { tags: { equals: [] } },
                { tags: { hasSome: userTags } }
              ]
            }
      ]
    },
    select: { id: true }
  });

  if (candidateRooms.length === 0) {
    return [];
  }

  const existing = await prisma.chatRoomMembership.findMany({
    where: {
      userId: user.id,
      roomId: { in: candidateRooms.map((room) => room.id) }
    },
    select: { roomId: true }
  });
  const existingRoomIds = new Set(existing.map((m) => m.roomId));
  const toCreate = candidateRooms.filter((room) => !existingRoomIds.has(room.id));
  if (toCreate.length === 0) {
    return [];
  }
  return prisma.$transaction(
    toCreate.map((room) =>
      prisma.chatRoomMembership.create({
        data: {
          roomId: room.id,
          userId: user.id,
          autoJoined: true
        }
      })
    )
  );
}

export async function findOrCreateConversation(userId: string, otherUserId: string) {
  const [a, b] = [userId, otherUserId].sort();
  let conversation = await prisma.conversation.findUnique({
    where: { userAId_userBId: { userAId: a, userBId: b } }
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        userAId: a,
        userBId: b
      }
    });
  }
  return conversation;
}

export async function logDirectMessage({
  actorId,
  conversationId,
  body
}: {
  actorId: string;
  conversationId: string;
  body: string;
}) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "DM_MESSAGE_CREATED",
      entity: "Conversation",
      entityId: conversationId,
      meta: {
        body,
        at: new Date().toISOString()
      }
    }
  });
}
