"use client";

import { useMemo, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TaskStatus = "todo" | "inProgress" | "done";

type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
};

type TaskBoardProps = {
  initialTasks: Task[];
};

const STATUS_COLUMNS: Array<{
  key: TaskStatus;
  label: string;
  tone: string;
  empty: string;
}> = [
  {
    key: "todo",
    label: "やること",
    tone: "border-slate-200 bg-slate-50",
    empty: "ここにタスクを追加しましょう"
  },
  {
    key: "inProgress",
    label: "進行中",
    tone: "border-brand-100 bg-brand-50/70",
    empty: "取り組み中のタスクが表示されます"
  },
  {
    key: "done",
    label: "完了",
    tone: "border-emerald-100 bg-emerald-50",
    empty: "完了したタスクはここにまとまります"
  }
];

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  todo: "inProgress",
  inProgress: "done",
  done: null
};

const PREV_STATUS: Record<TaskStatus, TaskStatus | null> = {
  todo: null,
  inProgress: "todo",
  done: "inProgress"
};

function formatDisplayDate(dateStr: string | null) {
  if (!dateStr) return "期限なし";
  const parsed = parseISO(dateStr);
  if (!isValid(parsed)) return "期限なし";
  return format(parsed, "yyyy/MM/dd");
}

function serializeDateForInput(dateStr: string | null) {
  if (!dateStr) return "";
  const parsed = parseISO(dateStr);
  if (!isValid(parsed)) return "";
  return format(parsed, "yyyy-MM-dd");
}

export function TaskBoard({ initialTasks }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    return STATUS_COLUMNS.map((column) => ({
      ...column,
      items: tasks.filter((task) => task.status === column.key)
    }));
  }, [tasks]);

  async function handleCreateTask(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError("タスク名を入力してください");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          dueDate: dueDate || undefined,
          status: "todo"
        })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error?.message ?? "タスクの作成に失敗しました");
      }
      const payload = await res.json();
      setTasks((prev) => [payload.data.task as Task, ...prev]);
      setTitle("");
      setDueDate("");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("タスクの作成に失敗しました");
      }
    } finally {
      setCreating(false);
    }
  }

  async function mutateTask(id: string, payload: Record<string, unknown>) {
    setMutatingId(id);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? "タスクの更新に失敗しました");
      }
      const data = await res.json();
      setTasks((prev) => prev.map((task) => (task.id === id ? (data.data.task as Task) : task)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "タスクの更新に失敗しました");
    } finally {
      setMutatingId(null);
    }
  }

  async function deleteTask(id: string) {
    setMutatingId(id);
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? "タスクの削除に失敗しました");
      }
      setTasks((prev) => prev.filter((task) => task.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "タスクの削除に失敗しました");
    } finally {
      setMutatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card
        title="新しいタスク"
        className="border-dashed bg-white/80"
      >
        <form onSubmit={handleCreateTask} className="grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)_auto]">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="タスク名"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "追加中..." : "追加"}
          </button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {grouped.map((column) => (
          <section key={column.key} className="space-y-3">
            <header className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">{column.label}</h3>
              <span className="text-xs text-slate-500">{column.items.length} 件</span>
            </header>
            <div className={cn("space-y-3 rounded-lg border p-4", column.tone)}>
              {column.items.length === 0 ? (
                <p className="text-sm text-slate-500">{column.empty}</p>
              ) : (
                column.items.map((task) => (
                  <article
                    key={task.id}
                    className="rounded-md bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">{task.title}</h4>
                        <p className="text-xs text-slate-500">{formatDisplayDate(task.dueDate)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteTask(task.id)}
                        disabled={mutatingId === task.id}
                        className="text-xs text-slate-400 hover:text-red-500 disabled:cursor-not-allowed"
                      >
                        削除
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <label className="flex items-center gap-1 text-slate-500">
                        期限
                        <input
                          type="date"
                          value={serializeDateForInput(task.dueDate)}
                          onChange={(event) => {
                            void mutateTask(task.id, { dueDate: event.target.value || null });
                          }}
                          disabled={mutatingId === task.id}
                          className="rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                      </label>
                      <div className="ml-auto flex gap-2">
                        {PREV_STATUS[task.status] && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = PREV_STATUS[task.status];
                              if (next) {
                                void mutateTask(task.id, { status: next });
                              }
                            }}
                            disabled={mutatingId === task.id}
                            className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 transition hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed"
                          >
                            ◀ 戻す
                          </button>
                        )}
                        {NEXT_STATUS[task.status] && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = NEXT_STATUS[task.status];
                              if (next) {
                                void mutateTask(task.id, { status: next });
                              }
                            }}
                            disabled={mutatingId === task.id}
                            className="rounded border border-brand-300 bg-brand-50 px-2 py-1 text-xs text-brand-600 transition hover:bg-brand-100 disabled:cursor-not-allowed"
                          >
                            進める ▶
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
