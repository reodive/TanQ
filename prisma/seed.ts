// prisma/seed.ts - 初期データを投入するスクリプト
import { PrismaClient, Role, SchoolPlan, BillingStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("password123", 10);

  const badgeDefinitions = [
    {
      code: "first_question",
      name: "スタートダッシュ",
      description: "はじめて質問を投稿しました",
      icon: "🎯"
    },
    {
      code: "first_upload",
      name: "ナレッジシェア",
      description: "共有スペースに資料をアップロードしました",
      icon: "📂"
    },
    {
      code: "credit_saver",
      name: "クレジットマイスター",
      description: "ウォレット残高が100ptを超えました",
      icon: "💰"
    },
    {
      code: "mentor_helper",
      name: "頼れる先輩",
      description: "回答を5件以上投稿しました",
      icon: "🤝"
    }
  ];

  await Promise.all(
    badgeDefinitions.map((badge) =>
      prisma.badge.upsert({
        where: { code: badge.code },
        update: {
          name: badge.name,
          description: badge.description,
          icon: badge.icon
        },
        create: {
          code: badge.code,
          name: badge.name,
          description: badge.description,
          icon: badge.icon
        }
      })
    )
  );

  let school = await prisma.school.findFirst({ where: { name: "未来探究学園" } });
  if (!school) {
    school = await prisma.school.create({
      data: {
        name: "未来探究学園",
        plan: SchoolPlan.starter,
        seats: 30,
        billingStatus: BillingStatus.active
      }
    });
  }

  const student = await prisma.user.upsert({
    where: { email: "student@example.com" },
    update: {},
    create: {
      name: "佐藤 花子",
      email: "student@example.com",
      passwordHash,
      role: Role.student,
      schoolId: school.id,
      wallet: {
        create: {
          balance: 30
        }
      }
    }
  });

  const responder = await prisma.user.upsert({
    where: { email: "responder@example.com" },
    update: {},
    create: {
      name: "山本 大輔",
      email: "responder@example.com",
      passwordHash,
      role: Role.responder,
      wallet: {
        create: {
          balance: 0
        }
      }
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "システム管理者",
      email: "admin@example.com",
      passwordHash,
      role: Role.sysAdmin,
      wallet: {
        create: {
          balance: 0
        }
      }
    }
  });

  await prisma.question.create({
    data: {
      studentId: student.id,
      title: "探究テーマの背景整理についてアドバイスが欲しいです",
      body: "地域の河川環境をテーマにした探究活動で、現状の課題整理と仮説づくりに悩んでいます。先行事例の調べ方やアンケート設計のポイントを教えてください。",
      tags: ["探究", "環境"],
      charCount: 60,
      creditCost: 1,
      status: "queued",
      aiCheckPassed: true
    }
  });

  await prisma.forumThread.create({
    data: {
      title: "今週の活動共有",
      tags: ["share"],
      createdById: student.id,
      posts: {
        create: {
          body: "フィールドワークで集めたデータの整理方法について話し合いました。皆さんはどんなツールを使っていますか？",
          createdById: student.id
        }
      }
    }
  });

  console.log("Seed data inserted");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
