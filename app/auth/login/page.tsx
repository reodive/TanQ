"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// ログインフォーム。メールアドレスとパスワード、ゲストモードを提供する。
export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestPending, startGuestLogin] = useTransition();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      email: form.get("email"),
      password: form.get("password")
    };
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "ログインできませんでした");
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

  const handleGuestLogin = (role: "student" | "sysAdmin") => {
    setError(null);
    startGuestLogin(async () => {
      try {
        const res = await fetch("/api/auth/guest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.message ?? "ゲストログインに失敗しました");
        }
        if (data?.data?.token) {
          localStorage.setItem("tanq_token", data.data.token as string);
        }
        const fallback = role === "sysAdmin" ? "/admin/accounts" : "/dashboard";
        router.push(data?.data?.redirectTo ?? fallback);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "ゲストログインに失敗しました");
      }
    });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6" aria-labelledby="login-title">
      <Card title="ログイン">
        <form className="space-y-4" onSubmit={handleSubmit} data-testid="login-form">
          <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="login-email">
            <span>メールアドレス</span>
            <Input
              id="login-email"
              name="email"
              type="email"
              required
              placeholder="tanq-student@example.jp"
              aria-required="true"
              data-testid="login-email"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="login-password">
            <span>パスワード</span>
            <Input
              id="login-password"
              name="password"
              type="password"
              required
              placeholder="********"
              aria-required="true"
              data-testid="login-password"
            />
          </label>
          {error && <p className="text-sm text-rose-600" role="alert" data-testid="login-error">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full" data-testid="login-submit">
            {loading ? "ログイン中..." : "ログインする"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          アカウントをお持ちでない方は{' '}
          <Link href="/auth/register" className="text-brand-600" data-testid="login-register-link">
            新規登録はこちら
          </Link>
        </p>
        <div className="mt-8 space-y-2" data-testid="guest-login">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">ゲストとして体験</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              disabled={guestPending}
              onClick={() => handleGuestLogin("student")}
            >
              {guestPending ? "準備中..." : "ゲスト（学習者ビュー）"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-brand-500 text-brand-600 hover:bg-brand-50"
              disabled={guestPending}
              onClick={() => handleGuestLogin("sysAdmin")}
            >
              {guestPending ? "準備中..." : "ゲスト（管理者ビュー）"}
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            本番環境では環境変数 ENABLE_GUEST_ACCESS=false を設定してゲストログインを無効化してください。
          </p>
        </div>
      </Card>
    </main>
  );
}
