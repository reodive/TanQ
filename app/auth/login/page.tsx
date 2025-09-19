"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// ????????????JWT????????????
export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        throw new Error(data?.error?.message ?? "???????????");
      }
      if (data?.data?.token) {
        localStorage.setItem("tanq_token", data.data.token as string);
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "???????????");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6" aria-labelledby="login-title">
      <Card title="???????????">
        <form className="space-y-4" onSubmit={handleSubmit} data-testid="login-form">
          <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="login-email">
            <span>???????</span>
            <Input
              id="login-email"
              name="email"
              type="email"
              required
              placeholder="student@example.com"
              aria-required="true"
              data-testid="login-email"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="login-password">
            <span>?????</span>
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
            {loading ? "?????..." : "????"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          ?????<Link href="/auth/register" className="text-brand-600" data-testid="login-register-link">???</Link>
        </p>
      </Card>
    </main>
  );
}
