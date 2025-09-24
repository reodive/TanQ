// lib/rank.ts - simple heuristic rank promotion logic based on activity and ratings
import { prisma } from "./prisma";
import { RankTier } from "@prisma/client";

export async function updateRankForUser(userId: string) {
  const [answers, reviews] = await Promise.all([
    prisma.answer.count({ where: { responderId: userId } }),
    prisma.review.aggregate({
      where: { answer: { responderId: userId } },
      _avg: { stars: true }
    })
  ]);
  const avg = reviews._avg.stars ?? 0;
  let nextRank: RankTier = "rookie";
  if (answers >= 5 && avg >= 3.5) nextRank = "explorer";
  if (answers >= 15 && avg >= 4) nextRank = "mentor";
  if (answers >= 40 && avg >= 4.3) nextRank = "master";
  if (answers >= 80 && avg >= 4.5) nextRank = "legend";
  await prisma.user.update({
    where: { id: userId },
    data: { rank: nextRank }
  });
}
