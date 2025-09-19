import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { Card } from "@/components/ui/card";

// ???????????
export default async function ModerationPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "sysAdmin") {
    redirect("/dashboard");
  }
  const reports = await prisma.forumPost.findMany({
    where: { reports: { gt: 0 } },
    orderBy: { reports: "desc" },
    take: 50,
    include: {
      createdBy: true,
      thread: true
    }
  });

  async function moderate(action: "dismiss" | "remove", postId: string) {
    "use server";
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "sysAdmin") return;
    if (action === "dismiss") {
      await prisma.forumPost.update({ where: { id: postId }, data: { reports: 0 } });
    } else {
      await prisma.forumPost.delete({ where: { id: postId } });
    }
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: `moderation_${action}`,
        entity: "ForumPost",
        entityId: postId
      }
    });
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <Card title="????">
        <div className="space-y-4">
          {reports.map((post) => (
            <div key={post.id} className="rounded-md border border-slate-200 p-4 text-sm text-slate-700">
              <p className="font-semibold">????: {post.thread.title}</p>
              <p>???: {post.createdBy.name}</p>
              <p className="whitespace-pre-wrap">{post.body}</p>
              <p className="text-xs text-slate-500">???: {post.reports}</p>
              <div className="mt-3 flex gap-3">
                <form action={async () => moderate("dismiss", post.id)}>
                  <button className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white">????</button>
                </form>
                <form action={async () => moderate("remove", post.id)}>
                  <button className="rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white">??</button>
                </form>
              </div>
            </div>
          ))}
          {reports.length === 0 && <p className="text-sm text-slate-500">?????????????????</p>}
        </div>
      </Card>
    </main>
  );
}
