"use client";

import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// ???????????????
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
        throw new Error(data?.error?.message ?? "?????????????");
      }
      setMessage("???????????????????????????");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "?????????????");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit} data-testid="thread-form">
      <Input name="title" placeholder="????????" required aria-required="true" data-testid="thread-title" />
      <Input name="tags" placeholder="??????????" data-testid="thread-tags" />
      <Textarea
        name="body"
        rows={6}
        placeholder="?????"
        required
        aria-required="true"
        data-testid="thread-body"
      />
      {error && <p className="text-sm text-rose-600" role="alert" data-testid="thread-error">{error}</p>}
      {message && <p className="text-sm text-emerald-600" data-testid="thread-success">{message}</p>}
      <Button type="submit" disabled={loading} data-testid="thread-submit">
        {loading ? "???..." : "???????"}
      </Button>
    </form>
  );
}
