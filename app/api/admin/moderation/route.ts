import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest } from "@/lib/auth";
import { json, error } from "@/lib/http";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload || ctx.payload.role !== "sysAdmin") {
    return error("システム管理者のみ利用できます", 403);
  }
  const [forumPosts, chatMessages, notes, resourceFiles] = await Promise.all([
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

  return json({
    reports: {
      forumPosts,
      chatMessages,
      notes,
      resourceFiles
    }
  });
}

export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.payload || ctx.payload.role !== "sysAdmin") {
    return error("システム管理者のみ利用できます", 403);
  }
  const payload = await req.json().catch(() => ({}));
  const { entity, id, action } = payload as {
    entity?: "forumPost" | "chatMessage" | "note" | "resourceFile";
    id?: string;
    action?: "dismiss" | "remove";
  };
  if (!entity || !id || !action) {
    return error("必要な項目が不足しています", 400);
  }

  switch (entity) {
    case "forumPost":
      if (action === "dismiss") {
        await prisma.forumPost.update({ where: { id }, data: { reports: 0 } });
      } else {
        await prisma.forumPost.delete({ where: { id } });
      }
      break;
    case "chatMessage":
      if (action === "dismiss") {
        await prisma.chatMessage.update({ where: { id }, data: { reports: 0 } });
      } else {
        await prisma.chatMessage.delete({ where: { id } });
      }
      break;
    case "note":
      if (action === "dismiss") {
        await prisma.note.update({ where: { id }, data: { reports: 0 } });
      } else {
        await prisma.note.delete({ where: { id } });
      }
      break;
    case "resourceFile":
      if (action === "dismiss") {
        await prisma.resourceFile.update({ where: { id }, data: { reports: 0 } });
      } else {
        await prisma.resourceFile.delete({ where: { id } });
      }
      break;
    default:
      return error("不明なエンティティです", 400);
  }

  await prisma.auditLog.create({
    data: {
      actorId: ctx.payload.sub,
      action: `moderation_${entity}_${action}`,
      entity: (() => {
        switch (entity) {
          case "forumPost":
            return "ForumPost";
          case "chatMessage":
            return "ChatMessage";
          case "note":
            return "Note";
          case "resourceFile":
            return "ResourceFile";
          default:
            return entity;
        }
      })(),
      entityId: id
    }
  });
  return json({ ok: true });
}
