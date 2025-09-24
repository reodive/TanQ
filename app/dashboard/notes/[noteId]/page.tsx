import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { NoteEditor } from "@/components/notes/note-editor";
import { ReportButton } from "@/components/moderation/ReportButton";

export default async function NoteDetailPage({ params }: { params: { noteId: string } }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/login");
  }

  const note = await prisma.note.findUnique({
    where: { id: params.noteId },
    include: {
      createdBy: { select: { id: true, name: true } }
    }
  });

  if (!note) {
    notFound();
  }

  if (note.createdById !== currentUser.id) {
    if (note.schoolId) {
      if (note.schoolId !== currentUser.schoolId) {
        notFound();
      }
    }
  }

  const serialized = {
    id: note.id,
    title: note.title,
    content: note.content,
    updatedAt: note.updatedAt.toISOString(),
    createdBy: note.createdBy
  };

  const canReport = note.createdById !== currentUser.id;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <header className="space-y-1">
        <p className="text-sm font-medium text-brand-600">共同編集ノート</p>
        <h1 className="text-3xl font-semibold text-slate-900">{note.title}</h1>
        <p className="text-sm text-slate-500">
          Markdown を使って記録を整理し、メンバーと共有しましょう。
        </p>
      </header>
      {canReport && (
        <div className="flex justify-end">
          <ReportButton endpoint={`/api/notes/${note.id}/report`} idleLabel="不適切として通報" successLabel="通報済み" />
        </div>
      )}
      <NoteEditor note={serialized} />
    </main>
  );
}
