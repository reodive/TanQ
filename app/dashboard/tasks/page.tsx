import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { TaskBoard } from "@/components/tasks/task-board";

export default async function TasksPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/login");
  }

  const tasks = await prisma.task.findMany({
    where: { ownerId: currentUser.id },
    orderBy: { createdAt: "desc" }
  });

  const serialized = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    createdAt: task.createdAt.toISOString()
  }));

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <header className="space-y-1">
        <p className="text-sm font-medium text-brand-600">学習サポート</p>
        <h1 className="text-3xl font-semibold text-slate-900">タスクボード</h1>
        <p className="text-sm text-slate-500">
          プロジェクトの進捗を Trello 風のボードで整理しましょう。ステータスや期限を簡単に更新できます。
        </p>
      </header>
      <TaskBoard initialTasks={serialized} />
    </main>
  );
}
