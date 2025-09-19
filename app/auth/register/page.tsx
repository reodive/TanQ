"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// ????????????????????????
export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roles = useMemo(
    () => [
      { value: "student", label: "????????" },
      { value: "responder", label: "?????????" },
      { value: "schoolAdmin", label: "?????" }
    ],
    []
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      role: form.get("role"),
      schoolId: form.get("schoolId") || undefined
    };
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "?????????");
      }
      if (data?.data?.token) {
        localStorage.setItem("tanq_token", data.data.token as string);
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "?????????");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6" aria-labelledby="register-title">
      <Card title="???????????">
        <form className="grid gap-4" onSubmit={handleSubmit} data-testid="register-form">
          <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="register-name">
            <span>??</span>
            <Input
              id="register-name"
              name="name"
              required
              placeholder="?? ??"
              aria-required="true"
              data-testid="register-name"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="register-email">
            <span>???????</span>
            <Input
              id="register-email"
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              aria-required="true"
              data-testid="register-email"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="register-password">
            <span>?????</span>
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
            <span>???</span>
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
            <span>??ID????</span>
            <Input
              id="register-school"
              name="schoolId"
              placeholder="?????ID???"
              data-testid="register-school"
            />
          </label>
          {error && <p className="text-sm text-rose-600" role="alert" data-testid="register-error">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full" data-testid="register-submit">
            {loading ? "???..." : "????"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          ??????????????<Link href="/auth/login" className="text-brand-600" data-testid="register-login-link">???</Link>
        </p>
      </Card>
    </main>
  );
}
