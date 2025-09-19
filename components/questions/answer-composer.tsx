"use client";

import { FormEvent, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// ??????????????
export function AnswerComposer({ questionId }: { questionId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      body: form.get("body")
    };
    try {
      const res = await fetch(`/api/questions/${questionId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "?????????");
      }
      setMessage("???????????????????????????");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "?????????");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit} data-testid="answer-form">
      <Textarea
        name="body"
        required
        rows={8}
        placeholder="????????????????"
        aria-required="true"
        data-testid="answer-body"
      />
      {error && (
        <p className="text-sm text-rose-600" role="alert" data-testid="answer-error">
          {error}
        </p>
      )}
      {message && <p className="text-sm text-emerald-600" data-testid="answer-success">{message}</p>}
      <Button type="submit" disabled={loading} data-testid="answer-submit">
        {loading ? "???..." : "?????"}
      </Button>
    </form>
  );
}
