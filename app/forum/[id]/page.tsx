import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PostComposer } from "@/components/forum/post-composer";
import { PostActions } from "@/components/forum/post-actions";

// フォーラムのスレッド詳細ページ。投稿と返信を一覧する。
export default async function ForumThreadPage({ params }: { params: { id: string } }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/login");
  }
  const thread = await prisma.forumThread.findUnique({
    where: { id: params.id },
    include: {
      createdBy: true,
      posts: {
        where: { parentPostId: null },
        orderBy: { createdAt: "asc" },
        include: {
          createdBy: true,
          replies: {
            orderBy: { createdAt: "asc" },
            include: {
              createdBy: true
            }
          }
        }
      }
    }
  });
  if (!thread) {
    redirect("/forum");
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-12" data-testid="forum-thread-page">
      <Card title={thread.title} data-testid="forum-thread-header">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500" data-testid="forum-thread-header-meta">
          <span>作成者: {thread.createdBy.name}</span>
          <span>{new Date(thread.createdAt).toLocaleString("ja-JP")}</span>
          {thread.tags.map((tag) => (
            <Badge key={tag} data-testid="forum-thread-header-tag">
              {tag}
            </Badge>
          ))}
        </div>
      </Card>

      {thread.posts.map((post) => (
        <Card key={post.id} title={`投稿者: ${post.createdBy.name}`} data-testid="forum-post">
          <p className="whitespace-pre-wrap text-sm text-slate-700" data-testid="forum-post-body">
            {post.body}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500" data-testid="forum-post-meta">
            <span>{new Date(post.createdAt).toLocaleString("ja-JP")}</span>
            <PostActions postId={post.id} />
          </div>
          {post.replies.length > 0 && (
            <div className="mt-4 space-y-3 rounded-md bg-slate-50 p-4" data-testid="forum-post-replies">
              {post.replies.map((reply) => (
                <div key={reply.id} data-testid="forum-reply">
                  <p className="text-xs font-semibold text-slate-600" data-testid="forum-reply-author">
                    {reply.createdBy.name}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-slate-700" data-testid="forum-reply-body">
                    {reply.body}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>{new Date(reply.createdAt).toLocaleString("ja-JP")}</span>
                    <PostActions postId={reply.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <details className="mt-4" data-testid="forum-reply-toggle">
            <summary className="cursor-pointer text-sm text-brand-600">返信を書く</summary>
            <div className="mt-3">
              <PostComposer threadId={thread.id} parentPostId={post.id} />
            </div>
          </details>
        </Card>
      ))}

      <Card title="新しい返信" data-testid="forum-thread-reply-form">
        <PostComposer threadId={thread.id} />
      </Card>
    </main>
  );
}
