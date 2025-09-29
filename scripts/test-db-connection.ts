// scripts/test-db-connection.ts - データベース接続テスト用のスクリプト
import { prisma, testDatabaseConnection } from "../lib/prisma";

async function main() {
  console.log("🔍 DATABASE_URL:", process.env.DATABASE_URL ? "✅ Set" : "❌ Not set");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is missing");
    process.exit(1);
  }

  console.log("🔗 Testing database connection...");

  const isConnected = await testDatabaseConnection();

  if (isConnected) {
    try {
      // 簡単なクエリテスト
      console.log("📊 Testing simple query...");
      const schoolCount = await prisma.school.count();
      console.log(`✅ Schools in database: ${schoolCount}`);

      const userCount = await prisma.user.count();
      console.log(`✅ Users in database: ${userCount}`);

      console.log("🎉 Database connection and queries working properly!");
    } catch (error) {
      console.error("❌ Query test failed:", error);
      process.exit(1);
    }
  } else {
    console.error("❌ Database connection test failed");
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("❌ Test script failed:", error);
  process.exit(1);
});