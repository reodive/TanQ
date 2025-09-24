// lib/aiCheck.ts - lightweight heuristics to mimic AI content validation
import { aiCheckSchema } from "./validators";

export type AiCheckResult = {
  passed: boolean;
  issues: string[];
  creditMultiplier: number;
  charCount: number;
};

export function runAiCheck(input: { title: string; body: string }): AiCheckResult {
  const parse = aiCheckSchema.safeParse(input);
  if (!parse.success) {
    return {
      passed: false,
      issues: ["入力内容が正しくありません"],
      creditMultiplier: 0,
      charCount: 0
    };
  }
  const { title, body } = parse.data;
  const issues: string[] = [];
  const charCount = body.length;
  if (title.length < 5) {
    issues.push("タイトルは5文字以上で入力してください");
  }
  if (charCount < 30) {
    issues.push("本文は30文字以上で入力してください");
  }
  if (!/[。！？]/.test(body)) {
    issues.push("本文に句読点や疑問符を入れて読みやすくしてください");
  }
  let creditMultiplier = 1;
  if (charCount > 800) creditMultiplier = 3;
  else if (charCount > 400) creditMultiplier = 2;
  const passed = issues.length === 0;
  return { passed, issues, creditMultiplier, charCount };
}
