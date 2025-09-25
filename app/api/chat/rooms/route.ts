import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContextFromRequest, requireRole } from "@/lib/auth";
import { chatRoomCreateSchema } from "@/lib/validators";
import { ensureAutoMemberships, deriveRoomSlug } from "@/lib/chat";
import { error, json } from "@/lib/http";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.user || !ctx.payload) {
    return error("ログインが必要です", 401);
  }

  await ensureAutoMemberships({
    id: ctx.user.id,
    schoolId: ctx.user.schoolId,
    grade: ctx.user.grade,
    tags: ctx.user.tags ?? []
  });

  const rooms = await prisma.chatRoom.findMany({
    where: {
      memberships: {
        some: {
          userId: ctx.user.id
        }
      }
    },
    include: {
      memberships: {
        where: { userId: ctx.user.id },
        select: { id: true, autoJoined: true, createdAt: true }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  type RoomWithMembership = (typeof rooms)[number];

  return json({
    rooms: rooms.map((room: RoomWithMembership) => {
      const { memberships, ...rest } = room;
      return {
        ...rest,
        membership: memberships[0] ?? null
      };
    })
  });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContextFromRequest(req);
  if (!ctx.user || !ctx.payload) {
    return error("ログインが必要です", 401);
  }
  try {
    requireRole(ctx.payload, ["schoolAdmin", "sysAdmin"]);
  } catch {
    return error("部屋を作成できる権限がありません", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = chatRoomCreateSchema.safeParse(body);
  if (!parsed.success) {
    return error("入力内容が正しくありません", 422, { issues: parsed.error.flatten() });
  }

  const { name, slug: slugInput, description, schoolId, grade, tags } = parsed.data;
  if (schoolId && ctx.payload.role !== "sysAdmin" && schoolId !== ctx.user.schoolId) {
    return error("所属する学校のIDのみ指定できます", 403);
  }

  const baseSlug = deriveRoomSlug(name, slugInput);
  let slug = baseSlug;
  let counter = 1;
  while (await prisma.chatRoom.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`;
  }

  const room = await prisma.chatRoom.create({
    data: {
      name,
      slug,
      description,
      schoolId: schoolId ?? ctx.user.schoolId,
      grade: grade ?? null,
      tags: tags ?? [],
      createdById: ctx.user.id,
      memberships: {
        create: {
          userId: ctx.user.id,
          autoJoined: false
        }
      }
    },
    include: {
      memberships: {
        where: { userId: ctx.user.id },
        select: { id: true, autoJoined: true, createdAt: true }
      }
    }
  });

  const { memberships, ...roomData } = room;
  return json({
    room: {
      ...roomData,
      membership: memberships[0] ?? null
    }
  }, 201);
}


