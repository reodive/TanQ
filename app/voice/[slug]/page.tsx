import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { Card } from "@/components/ui/card";
import VoiceRoomClient from "../VoiceRoomClient";

export default async function VoiceRoomPage({ params }: { params: { slug: string } }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/login");
  }

  const room = await prisma.chatRoom.findUnique({
    where: { slug: params.slug },
    include: {
      memberships: {
        where: { userId: currentUser.id },
        select: { id: true }
      },
      createdBy: {
        select: { id: true, name: true }
      }
    }
  });

  if (!room) {
    notFound();
  }

  if (room.memberships.length === 0) {
    await prisma.chatRoomMembership
      .create({
        data: {
          roomId: room.id,
          userId: currentUser.id,
          autoJoined: false
        }
      })
      .catch(() => undefined);
  }

  const memberList = await prisma.chatRoomMembership.findMany({
    where: { roomId: room.id },
    include: {
      user: {
        select: { id: true, name: true }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <Card
        title={
          <div className="flex flex-col gap-1">
            <span className="text-xl">{room.name}</span>
            <span className="text-sm font-normal text-slate-500">リアルタイム音声ルーム</span>
          </div>
        }
        action={<Link href="/voice" className="text-sm text-brand-600 hover:underline">ルーム一覧へ戻る</Link>}
      >
        {room.description ? (
          <p>{room.description}</p>
        ) : (
          <p className="text-sm text-slate-500">参加メンバーと音声でつながりましょう。</p>
        )}
        <div className="text-xs text-slate-500">
          作成者: {room.createdBy.name}
        </div>
      </Card>
      <VoiceRoomClient
        roomSlug={room.slug}
        user={{ id: currentUser.id, name: currentUser.name }}
        members={memberList.map((membership) => ({ id: membership.user.id, name: membership.user.name }))}
      />
    </main>
  );
}
