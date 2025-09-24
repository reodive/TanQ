"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Card } from "@/components/ui/card";

export type NoteSummary = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
  };
};

type NoteListProps = {
  initialNotes: NoteSummary[];
};

function toExcerpt(markdown: string) {
  return markdown
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/[*#>\-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function NoteList({ initialNotes }: NoteListProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: `# ${title.trim()}\n\n`
        })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error?.message ?? "ノートの作成に失敗しました");
      }
      const payload = await res.json();
      const newNote = payload.data.note as NoteSummary;
      setNotes((prev) => [newNote, ...prev]);
      setTitle("");
      router.push(`/dashboard/notes/${newNote.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ノートの作成に失敗しました");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card title="新しいノート">
        <form onSubmit={handleCreate} className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="ノートのタイトル"
            className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "作成中..." : "作成"}
          </button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {notes.map((note) => (
          <Link
            key={note.id}
            href={`/dashboard/notes/${note.id}`}
            className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">{note.title}</h3>
              <span className="text-xs text-slate-500">
                {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true, locale: ja })}
              </span>
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-slate-600">
              {toExcerpt(note.content) || "本文はまだありません"}
            </p>
            <p className="mt-3 text-xs text-slate-400">作成者: {note.createdBy.name}</p>
          </Link>
        ))}
        {notes.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            ノートはまだありません。上のフォームから作成しましょう。
          </p>
        )}
      </div>
    </div>
  );
}
