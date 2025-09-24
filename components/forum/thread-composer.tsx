"use client";

import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// 新しいフォーラムスレッドを作成するフォーム。
export function ThreadComposer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      title: form.get("title"),
      tags: (form.get("tags") as string)
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      body: form.get("body")
    };
    try {
      const res = await fetch("/api/forum/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "スレッドの作成に失敗しました");
      }
      setMessage("スレッドを作成しました。数秒後に一覧へ反映されます。");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "スレッドの作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit} data-testid="thread-form">
      <Input name="title" placeholder="例: 今日の探究活動の振り返り" required aria-required="true" data-testid="thread-title" />
      <Input name="tags" placeholder="カンマ区切りでタグを入力 (例: 探究, プロジェクト)" data-testid="thread-tags" />
      <Textarea
        name="body"
        rows={6}
        placeholder="本文を入力してください"
        required
        aria-required="true"
        data-testid="thread-body"
      />
      {error && <p className="text-sm text-rose-600" role="alert" data-testid="thread-error">{error}</p>}
      {message && <p className="text-sm text-emerald-600" data-testid="thread-success">{message}</p>}
      <Button type="submit" disabled={loading} data-testid="thread-submit">
        {loading ? "送信中..." : "スレッドを投稿"}
      </Button>
    </form>
  );
}

