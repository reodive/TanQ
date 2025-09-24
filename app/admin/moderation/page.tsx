import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MODERATION_PATH = "/admin/moderation";

type ModerationEntity = "forumPost" | "chatMessage" | "note" | "resourceFile";

type ModerateAction = "dismiss" | "remove";

type ChatReport = {
  id: string;
  body: string;
  reports: number;
  createdAt: Date;
  sender: {
    name: string;
  };
  conversation?: {
    userA: { name: string };
    userB: { name: string };
  } | null;
  room?: {
    name: string;
  } | null;
};

function truncate(text: string, length = 220) {
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1)}…`;
}

export default async function ModerationPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "sysAdmin") {
    redirect("/dashboard");
  }

  const [forumReports, chatReportsRaw, noteReports, resourceReports] = await Promise.all([
    prisma.forumPost.findMany({
      where: { reports: { gt: 0 } },
      orderBy: { reports: "desc" },
      take: 50,
      include: {
        createdBy: true,
        thread: true
      }
    }),
    prisma.chatMessage.findMany({
      where: { reports: { gt: 0 } },
      orderBy: { reports: "desc" },
      take: 50,
      include: {
        sender: {
          select: { id: true, name: true }
        },
        conversation: {
          select: {
            id: true,
            userA: { select: { id: true, name: true } },
            userB: { select: { id: true, name: true } }
          }
        },
        room: {
          select: { id: true, name: true }
        }
      }
    }),
    prisma.note.findMany({
      where: { reports: { gt: 0 } },
      orderBy: { reports: "desc" },
      take: 50,
      include: {
        createdBy: {
          select: { id: true, name: true }
        }
      }
    }),
    prisma.resourceFile.findMany({
      where: { reports: { gt: 0 } },
      orderBy: { reports: "desc" },
      take: 50,
      include: {
        owner: {
          select: { id: true, name: true }
        }
      }
    })
  ]);

  const chatReports: ChatReport[] = chatReportsRaw as ChatReport[];

  async function moderate(action: ModerateAction, entity: ModerationEntity, targetId: string) {
    "use server";
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "sysAdmin") return;

    switch (entity) {
      case "forumPost":
        if (action === "dismiss") {
          await prisma.forumPost.update({ where: { id: targetId }, data: { reports: 0 } });
        } else {
          await prisma.forumPost.delete({ where: { id: targetId } });
        }
        break;
      case "chatMessage":
        if (action === "dismiss") {
          await prisma.chatMessage.update({ where: { id: targetId }, data: { reports: 0 } });
        } else {
          await prisma.chatMessage.delete({ where: { id: targetId } });
        }
        break;
      case "note":
        if (action === "dismiss") {
          await prisma.note.update({ where: { id: targetId }, data: { reports: 0 } });
        } else {
          await prisma.note.delete({ where: { id: targetId } });
        }
        break;
      case "resourceFile":
        if (action === "dismiss") {
          await prisma.resourceFile.update({ where: { id: targetId }, data: { reports: 0 } });
        } else {
          await prisma.resourceFile.delete({ where: { id: targetId } });
        }
        break;
      default:
        return;
    }

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: `moderation_${entity}_${action}`,
        entity:
          entity === "forumPost"
            ? "ForumPost"
            : entity === "chatMessage"
            ? "ChatMessage"
            : entity === "note"
            ? "Note"
            : "ResourceFile",
        entityId: targetId
      }
    });

    revalidatePath(MODERATION_PATH);
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <Card title="チャットメッセージの通報">
        {chatReports.length === 0 && <p className="text-sm text-slate-500">チャットの通報はありません。</p>}
        <div className="space-y-4">
          {chatReports.map((message: ChatReport) => {
            const contextLabel = message.conversation
              ? `DM: ${message.conversation.userA.name} / ${message.conversation.userB.name}`
              : message.room
              ? `ルーム: ${message.room.name}`
              : "コンテキスト未設定";
            return (
              <div key={message.id} className="rounded-md border border-slate-200 p-4 text-sm text-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">送信者: {message.sender.name}</p>
                  <Badge tone="warning">通報数: {message.reports}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">{contextLabel}</p>
                <p className="mt-3 whitespace-pre-wrap">{message.body}</p>
                <p className="mt-2 text-xs text-slate-400">送信日時: {message.createdAt.toLocaleString("ja-JP")}</p>
                <div className="mt-3 flex gap-3">
                  <form action={async () => moderate("dismiss", "chatMessage", message.id)}>
                    <button className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white">通報を解消</button>
                  </form>
                  <form action={async () => moderate("remove", "chatMessage", message.id)}>
                    <button className="rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white">メッセージを削除</button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="ノートの通報">
        {noteReports.length === 0 && <p className="text-sm text-slate-500">ノートの通報はありません。</p>}
        <div className="space-y-4">
          {noteReports.map((note) => (
            <div key={note.id} className="rounded-md border border-slate-200 p-4 text-sm text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{note.title}</p>
                  <p className="text-xs text-slate-500">作成者: {note.createdBy.name}</p>
                </div>
                <Badge tone="warning">通報数: {note.reports}</Badge>
              </div>
              <p className="mt-3 whitespace-pre-wrap">{truncate(note.content)}</p>
              <div className="mt-3 flex gap-3">
                <form action={async () => moderate("dismiss", "note", note.id)}>
                  <button className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white">通報を解消</button>
                </form>
                <form action={async () => moderate("remove", "note", note.id)}>
                  <button className="rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white">ノートを削除</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="共有ファイルの通報">
        {resourceReports.length === 0 && <p className="text-sm text-slate-500">共有ファイルの通報はありません。</p>}
        <div className="space-y-4">
          {resourceReports.map((file) => (
            <div key={file.id} className="rounded-md border border-slate-200 p-4 text-sm text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{file.filename}</p>
                  <p className="text-xs text-slate-500">所有者: {file.owner.name}</p>
                </div>
                <Badge tone="warning">通報数: {file.reports}</Badge>
              </div>
              {file.description && <p className="mt-3 whitespace-pre-wrap">{truncate(file.description)}</p>}
              <div className="mt-3 flex gap-3">
                <form action={async () => moderate("dismiss", "resourceFile", file.id)}>
                  <button className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white">通報を解消</button>
                </form>
                <form action={async () => moderate("remove", "resourceFile", file.id)}>
                  <button className="rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white">ファイルを削除</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="フォーラム投稿の通報">
        {forumReports.length === 0 && <p className="text-sm text-slate-500">フォーラムの通報はありません。</p>}
        <div className="space-y-4">
          {forumReports.map((post) => (
            <div key={post.id} className="rounded-md border border-slate-200 p-4 text-sm text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">スレッド: {post.thread.title}</p>
                  <p className="text-xs text-slate-500">投稿者: {post.createdBy.name}</p>
                </div>
                <Badge tone="warning">通報数: {post.reports}</Badge>
              </div>
              <p className="mt-3 whitespace-pre-wrap">{post.body}</p>
              <div className="mt-3 flex gap-3">
                <form action={async () => moderate("dismiss", "forumPost", post.id)}>
                  <button className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white">通報を解消</button>
                </form>
                <form action={async () => moderate("remove", "forumPost", post.id)}>
                  <button className="rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white">投稿を削除</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}
