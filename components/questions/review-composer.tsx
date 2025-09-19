"use client";

import { FormEvent, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// ?????????????
export function ReviewComposer({ questionId, answerId }: { questionId: string; answerId: string }) {
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
      stars: Number(form.get("stars")),
      comment: form.get("comment"),
      answerId
    };
    try {
      const res = await fetch(`/api/questions/${questionId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "?????????");
      }
      setMessage("?????????????????????????????????");
    } catch (err) {
      setError(err instanceof Error ? err.message : "?????????");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit} data-testid="review-form">
      <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="review-stars">
        <span>???1?5?</span>
        <input
          id="review-stars"
          type="number"
          name="stars"
          min={1}
          max={5}
          defaultValue={5}
          className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
          aria-required="true"
          data-testid="review-stars"
        />
      </label>
      <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="review-comment">
        <span>????????</span>
        <Textarea
          id="review-comment"
          name="comment"
          rows={4}
          placeholder="??????????????"
          data-testid="review-comment"
        />
      </label>
      {error && <p className="text-sm text-rose-600" role="alert" data-testid="review-error">{error}</p>}
      {message && <p className="text-sm text-emerald-600" data-testid="review-success">{message}</p>}
      <Button type="submit" disabled={loading} data-testid="review-submit">
        {loading ? "???..." : "???????"}
      </Button>
    </form>
  );
}
