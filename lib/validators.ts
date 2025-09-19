// lib/validators.ts - Zod schemas shared across API endpoints and forms
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["student", "responder", "schoolAdmin"]),
  schoolId: z.string().uuid().optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const questionSchema = z.object({
  title: z.string().min(5),
  body: z.string().min(30),
  tags: z.array(z.string().min(1)).max(5).default([]),
  status: z.enum(["draft", "queued"]).default("draft")
});

export const answerSchema = z.object({
  body: z.string().min(30)
});

export const reviewSchema = z.object({
  answerId: z.string().uuid().optional(),
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional()
});

export const forumThreadSchema = z.object({
  title: z.string().min(5),
  tags: z.array(z.string()).max(5).default([]),
  body: z.string().min(10)
});

export const forumPostSchema = z.object({
  body: z.string().min(3),
  parentPostId: z.string().uuid().optional()
});

export const purchaseSchema = z.object({
  item: z.enum(["plan", "credits"]),
  amountJpy: z.number().int().positive(),
  credits: z.number().int().nonnegative().optional().default(0)
});

export const aiCheckSchema = z.object({
  title: z.string(),
  body: z.string()
});
