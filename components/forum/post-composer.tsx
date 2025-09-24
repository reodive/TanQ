"use client";

import { FormEvent, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// フォーラムへの投稿・返信を作成するフォーム。
export function PostComposer({ threadId, parentPostId }: { threadId: string; parentPostId?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      body: form.get("body")
    };
    if (parentPostId) {
      payload.parentPostId = parentPostId;
    }
    try {
      const res = await fetch(`/api/forum/threads/${threadId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "投稿に失敗しました");
      }
      setMessage("投稿を保存しました。数秒後に画面へ反映されます。");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "投稿に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit} data-testid={parentPostId ? "reply-form" : "post-form"}>
      <Textarea
        name="body"
        rows={4}
        placeholder="ここに内容を入力してください"
        required
        aria-required="true"
        data-testid={parentPostId ? "reply-body" : "post-body"}
      />
      {error && <p className="text-sm text-rose-600" role="alert" data-testid="post-error">{error}</p>}
      {message && <p className="text-sm text-emerald-600" data-testid="post-success">{message}</p>}
      <Button type="submit" disabled={loading} data-testid={parentPostId ? "reply-submit" : "post-submit"}>
        {loading ? "送信中..." : parentPostId ? "返信する" : "投稿する"}
      </Button>
    </form>
  );
}
