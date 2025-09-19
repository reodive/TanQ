"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// ????????????????????
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
        throw new Error(data?.error?.message ?? `${kind} failed`);
      }
      if (kind === "like") setLiked(true);
      if (kind === "report") setReported(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "?????????");
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
        {liked ? "????" : "???"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={reported}
        onClick={() => trigger("report")}
        data-testid="post-report"
      >
        {reported ? "???" : "??"}
      </Button>
      {error && <span className="text-rose-600" role="alert" data-testid="post-action-error">{error}</span>}
    </div>
  );
}
