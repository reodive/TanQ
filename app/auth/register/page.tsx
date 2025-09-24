"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// 新規登録フォーム。役割と学校 ID を指定してアカウントを作成します。
export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roles = useMemo(
    () => [
      { value: "student", label: "生徒" },
      { value: "responder", label: "メンター（回答者）" },
      { value: "schoolAdmin", label: "学校管理者" }
    ],
    []
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const grade = (form.get("grade") as string | null)?.trim();
    const tagsInput = (form.get("tags") as string | null)?.trim();
    const tags = tagsInput
      ? tagsInput
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : undefined;
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      role: form.get("role"),
      schoolId: form.get("schoolId") || undefined,
      grade: grade || undefined,
      tags
    };
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "登録に失敗しました");
      }
      if (data?.data?.token) {
        localStorage.setItem("tanq_token", data.data.token as string);
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "予期しないエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6" aria-labelledby="register-title">
      <Card title="新規登録">
        <form className="grid gap-4" onSubmit={handleSubmit} data-testid="register-form">
          <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="register-name">
            <span>氏名</span>
            <Input
              id="register-name"
              name="name"
              required
              placeholder="山田 太郎"
              aria-required="true"
              data-testid="register-name"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="register-email">
            <span>メールアドレス</span>
            <Input
              id="register-email"
              type="email"
              name="email"
              required
              placeholder="tanq-student@example.jp"
              aria-required="true"
              data-testid="register-email"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="register-password">
            <span>パスワード</span>
            <Input
              id="register-password"
              type="password"
              name="password"
              required
              minLength={8}
              placeholder="********"
              aria-required="true"
              data-testid="register-password"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="register-role">
            <span>役割</span>
            <select
              id="register-role"
              name="role"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              data-testid="register-role"
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="register-school">
            <span>学校 ID（任意）</span>
            <Input
              id="register-school"
              name="schoolId"
              placeholder="学校 ID がある場合のみ入力"
              data-testid="register-school"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="register-grade">
            <span>学年（任意）</span>
            <Input
              id="register-grade"
              name="grade"
              placeholder="例: 中学2年"
              data-testid="register-grade"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="register-tags">
            <span>興味タグ（カンマ区切り・任意）</span>
            <Input
              id="register-tags"
              name="tags"
              placeholder="理科, プロジェクト, 部活動"
              data-testid="register-tags"
            />
            <p className="text-xs text-slate-500">指定したタグに対応するチャットルームへ自動参加します。</p>
          </label>
          {error && <p className="text-sm text-rose-600" role="alert" data-testid="register-error">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full" data-testid="register-submit">
            {loading ? "送信中..." : "登録する"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          すでにアカウントをお持ちの方は<Link href="/auth/login" className="text-brand-600" data-testid="register-login-link">ログイン</Link>
        </p>
      </Card>
    </main>
  );
}
