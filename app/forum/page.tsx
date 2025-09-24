import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThreadComposer } from "@/components/forum/thread-composer";

// フォーラムのスレッド一覧ページ。投稿フォームと最新トピックを表示する。
export default async function ForumPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/login");
  }
  const threads = await prisma.forumThread.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      createdBy: true,
      posts: {
        orderBy: { createdAt: "asc" },
        take: 1
      }
    }
  });

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-6 py-12 lg:grid-cols-3" data-testid="forum-page">
      <Card title="新しいトピックを作成" className="lg:col-span-1" data-testid="forum-thread-form">
        <ThreadComposer />
      </Card>
      <div className="space-y-4 lg:col-span-2" data-testid="forum-thread-list">
        {threads.map((thread) => (
          <Card
            key={thread.id}
            title={
              <Link
                href={`/forum/${thread.id}`}
                className="text-lg font-semibold text-slate-800"
                data-testid="forum-thread-title"
              >
                {thread.title}
              </Link>
            }
            data-testid="forum-thread-item"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500" data-testid="forum-thread-meta">
              <span>作成者: {thread.createdBy.name}</span>
              <span>{new Date(thread.createdAt).toLocaleString("ja-JP")}</span>
              {thread.tags.map((tag) => (
                <Badge key={tag} data-testid="forum-thread-tag">
                  {tag}
                </Badge>
              ))}
            </div>
            {thread.posts[0] && (
              <p className="mt-3 line-clamp-3 text-sm text-slate-700" data-testid="forum-thread-snippet">
                {thread.posts[0].body}
              </p>
            )}
          </Card>
        ))}
        {threads.length === 0 && (
          <p className="text-sm text-slate-500" data-testid="forum-empty">
            まだスレッドがありません。
          </p>
        )}
      </div>
    </main>
  );
}
