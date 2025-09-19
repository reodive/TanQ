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
      issues: ["?????????"],
      creditMultiplier: 0,
      charCount: 0
    };
  }
  const { title, body } = parse.data;
  const issues: string[] = [];
  const charCount = body.length;
  if (title.length < 5) {
    issues.push("?????5?????????????");
  }
  if (charCount < 30) {
    issues.push("???30?????????????");
  }
  if (!/??|??/.test(body)) {
    issues.push("????????????????????????");
  }
  let creditMultiplier = 1;
  if (charCount > 800) creditMultiplier = 3;
  else if (charCount > 400) creditMultiplier = 2;
  const passed = issues.length === 0;
  return { passed, issues, creditMultiplier, charCount };
}
