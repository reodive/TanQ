// prisma/seed.ts - ????????????????
import { PrismaClient, Role, SchoolPlan, BillingStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("password123", 10);

  const school = await prisma.school.upsert({
    where: { name: "????" },
    update: {},
    create: {
      name: "????",
      plan: SchoolPlan.starter,
      seats: 30,
      billingStatus: BillingStatus.active
    }
  });

  const student = await prisma.user.upsert({
    where: { email: "student@example.com" },
    update: {},
    create: {
      name: "??? ??",
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
      name: "???? ??",
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
      name: "???",
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
      title: "????????????",
      body: "?????????????????????????????????????????????????",
      tags: ["????", "??"],
      charCount: 60,
      creditCost: 1,
      status: "queued",
      aiCheckPassed: true
    }
  });

  await prisma.forumThread.create({
    data: {
      title: "???????????",
      tags: ["share"],
      createdById: student.id,
      posts: {
        create: {
          body: "???????????????????",
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
