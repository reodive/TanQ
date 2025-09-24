"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";

type Note = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
  };
};

type NoteEditorProps = {
  note: Note;
};

export function NoteEditor({ note }: NoteEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content ?? "");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDirty = useMemo(() => title !== note.title || content !== (note.content ?? ""), [title, content, note.title, note.content]);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content ?? "");
  }, [note.content, note.id, note.title]);

  async function handleSave() {
    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? "ノートの保存に失敗しました");
      }
      setLastSavedAt(new Date().toISOString());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ノートの保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <header className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="min-w-[240px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-lg font-semibold text-slate-900 focus:border-brand-500 focus:outline-none"
            placeholder="ノートのタイトル"
          />
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>最終更新 {format(new Date(note.updatedAt), "yyyy/MM/dd HH:mm")}</span>
            <span>作成者 {note.createdBy.name}</span>
          </div>
        </header>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`rounded-md px-3 py-1 text-sm ${mode === "edit" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            編集
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`rounded-md px-3 py-1 text-sm ${mode === "preview" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            プレビュー
          </button>
          <div className="ml-auto flex items-center gap-3">
            {lastSavedAt && <span className="text-xs text-emerald-600">保存しました ({format(new Date(lastSavedAt), "HH:mm:ss")})</span>}
            {isDirty && <span className="text-xs text-orange-500">未保存の変更があります</span>}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      {mode === "edit" ? (
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="min-h-[420px] w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 focus:border-brand-500 focus:outline-none"
          placeholder="Markdown 形式でノートを記述できます。"
        />
      ) : (
        <Card className="prose max-w-none bg-white">
          {content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          ) : (
            <p className="text-sm text-slate-500">まだ内容がありません。編集タブから入力してください。</p>
          )}
        </Card>
      )}
    </div>
  );
}
