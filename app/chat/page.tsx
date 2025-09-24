import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { ensureAutoMemberships } from "@/lib/chat";
import ChatPageClient from "@/components/chat/ChatPageClient";

export default async function ChatPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/login");
  }

  await ensureAutoMemberships({
    id: currentUser.id,
    schoolId: currentUser.schoolId,
    grade: currentUser.grade,
    tags: currentUser.tags ?? []
  });

  const rooms = await prisma.chatRoom.findMany({
    where: {
      memberships: {
        some: {
          userId: currentUser.id
        }
      }
    },
    include: {
      memberships: {
        where: { userId: currentUser.id },
        select: { id: true, autoJoined: true, createdAt: true }
      }
    },
    orderBy: { name: "asc" }
  });

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ userAId: currentUser.id }, { userBId: currentUser.id }]
    },
    include: {
      userA: { select: { id: true, name: true, role: true } },
      userB: { select: { id: true, name: true, role: true } }
    },
    orderBy: { updatedAt: "desc" }
  });

  const dmCandidates = await prisma.user.findMany({
    where: {
      id: { not: currentUser.id },
      ...(currentUser.schoolId
        ? {
            OR: [{ schoolId: currentUser.schoolId }, { schoolId: null }]
          }
        : {})
    },
    select: {
      id: true,
      name: true,
      role: true,
      grade: true
    },
    orderBy: { name: "asc" },
    take: 50
  });

  const serializedRooms = rooms.map((room) => ({
    id: room.id,
    name: room.name,
    slug: room.slug,
    description: room.description,
    grade: room.grade,
    tags: room.tags,
    createdAt: room.createdAt.toISOString(),
    membership: room.memberships[0]
      ? {
          id: room.memberships[0].id,
          autoJoined: room.memberships[0].autoJoined,
          createdAt: room.memberships[0].createdAt.toISOString()
        }
      : null
  }));

  const serializedConversations = conversations.map((conversation) => {
    const otherParticipant =
      conversation.userAId === currentUser.id ? conversation.userB : conversation.userA;
    return {
      id: conversation.id,
      userAId: conversation.userAId,
      userBId: conversation.userBId,
      updatedAt: conversation.updatedAt.toISOString(),
      otherParticipant
    };
  });

  const serializedCandidates = dmCandidates.map((candidate) => ({
    ...candidate,
    grade: candidate.grade ?? null
  }));

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <ChatPageClient
        currentUser={{ id: currentUser.id, name: currentUser.name, role: currentUser.role }}
        rooms={serializedRooms}
        conversations={serializedConversations}
        dmCandidates={serializedCandidates}
        canCreateRooms={currentUser.role === "schoolAdmin" || currentUser.role === "sysAdmin"}
      />
    </main>
  );
}
