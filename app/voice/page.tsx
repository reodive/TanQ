import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { ensureAutoMemberships } from "@/lib/chat";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CreateVoiceRoomForm from "./CreateVoiceRoomForm";

export default async function VoiceRoomsPage() {
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
        some: { userId: currentUser.id }
      }
    },
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: { memberships: true }
      }
    }
  });

  const canCreate = currentUser.role === "schoolAdmin" || currentUser.role === "sysAdmin";

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">ボイスチャット・勉強会ルーム</h1>
        <p className="text-sm text-slate-600">
          同じ部屋に参加しているメンバーとリアルタイムで音声通話ができます。勉強会や少人数の相談に活用してください。
        </p>
      </div>
      {canCreate && (
        <Card title="新しいボイスルームを作成">
          <CreateVoiceRoomForm defaultSchoolId={currentUser.schoolId} />
        </Card>
      )}
      <Card title="参加可能なルーム">
        <div className="space-y-4">
          {rooms.map((room) => (
            <div key={room.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-800">{room.name}</p>
                  {room.description && <p className="mt-1 text-sm text-slate-600">{room.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>メンバー: {room._count.memberships}</span>
                    {room.grade && (
                      <Badge className="bg-indigo-100 text-indigo-700">学年: {room.grade}</Badge>
                    )}
                    {room.tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/voice/${room.slug}`}
                    className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
                  >
                    ボイスルームへ
                  </Link>
                </div>
              </div>
            </div>
          ))}
          {rooms.length === 0 && <p className="text-sm text-slate-500">参加できるルームがまだありません。</p>}
        </div>
      </Card>
    </main>
  );
}
