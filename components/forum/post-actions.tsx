"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// 投稿に対する「いいね」と通報アクションをまとめたコンポーネント。
export function PostActions({ postId }: { postId: string }) {
  const [liked, setLiked] = useState(false);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trigger = async (kind: "like" | "report") => {
    setError(null);
    try {
      const res = await fetch(`/api/forum/posts/${postId}/${kind}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const label = kind === "like" ? "いいね" : "通報";
        throw new Error(data?.error?.message ?? `${label}に失敗しました`);
      }
      if (kind === "like") setLiked(true);
      if (kind === "report") setReported(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "処理に失敗しました");
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500" data-testid="post-actions">
      <Button
        type="button"
        variant="ghost"
        disabled={liked}
        onClick={() => trigger("like")}
        data-testid="post-like"
      >
        {liked ? "いいね済み" : "いいね"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={reported}
        onClick={() => trigger("report")}
        data-testid="post-report"
      >
        {reported ? "通報済み" : "通報"}
      </Button>
      {error && <span className="text-rose-600" role="alert" data-testid="post-action-error">{error}</span>}
    </div>
  );
}
