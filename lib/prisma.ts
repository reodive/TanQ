// lib/prisma.ts - Prisma client singleton to avoid exhausting connections in dev
import { PrismaClient } from "@prisma/client";

// Node.jsのprocessオブジェクトの型定義
declare const process: {
  env: Record<string, string | undefined>;
  NODE_ENV?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

// DATABASE_URLの存在チェックを追加
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  console.error("🔍 All env vars:", Object.keys(process.env).filter(key => key.includes('DATABASE')));
  console.error("🔍 NODE_ENV:", process.env.NODE_ENV);
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL environment variable is required in production");
  }
}

console.log("🔗 DATABASE_URL:", process.env.DATABASE_URL ? "✅ Set" : "❌ Not set");
console.log("🔍 NODE_ENV:", process.env.NODE_ENV);
console.log("🔍 Available DATABASE env vars:", Object.keys(process.env).filter(key => key.includes('DATABASE')));

export const prisma = globalThis.prismaGlobal ?? new PrismaClient({
  log: ["error", "warn", "info"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

// 接続テスト関数を追加
export async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}