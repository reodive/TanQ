import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { NoteList } from "@/components/notes/note-list";

export default async function NotesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/login");
  }

  const schoolId = currentUser.schoolId ?? null;

  const notes = await prisma.note.findMany({
    where: schoolId
      ? {
          OR: [
            { schoolId },
            { schoolId: null },
            { createdById: currentUser.id }
          ]
        }
      : {
          OR: [
            { schoolId: null },
            { createdById: currentUser.id }
          ]
        },
    include: {
      createdBy: {
        select: { id: true, name: true }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  const summaries = notes.map((note) => ({
    id: note.id,
    title: note.title,
    content: note.content,
    updatedAt: note.updatedAt.toISOString(),
    createdBy: note.createdBy
  }));

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <header className="space-y-1">
        <p className="text-sm font-medium text-brand-600">学習サポート</p>
        <h1 className="text-3xl font-semibold text-slate-900">共同編集ノート</h1>
        <p className="text-sm text-slate-500">
          Markdown でノートを作成し、同じ学校のメンバーと共有できます。リアルタイムで更新内容を確認しましょう。
        </p>
      </header>
      <NoteList initialNotes={summaries} />
    </main>
  );
}
