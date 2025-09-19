"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ?????????AI???????????????????????
export default function NewQuestionPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"draft" | "queued">("draft");
  const [aiFeedback, setAiFeedback] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const tags = (form.get("tags") as string)
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const payload = {
      title: form.get("title"),
      body: form.get("body"),
      tags,
      status: mode
    };
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setAiFeedback(data?.error?.issues ?? null);
        throw new Error(data?.error?.message ?? "?????????");
      }
      if (mode === "queued") {
        router.push(`/questions/${data?.data?.question?.id ?? ""}`);
        router.refresh();
      } else {
        setAiFeedback(data?.data?.aiResult?.issues ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "?????????");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-12" aria-labelledby="new-question-title">
      <Card title="????????">
        <form className="space-y-6" onSubmit={handleSubmit} data-testid="question-form">
          <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="question-title">
            <span>????</span>
            <Input
              id="question-title"
              name="title"
              required
              placeholder="???????????????"
              aria-required="true"
              data-testid="question-title"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="question-body">
            <span>??</span>
            <Textarea
              id="question-body"
              name="body"
              required
              rows={10}
              placeholder="??????????????????????????"
              aria-required="true"
              data-testid="question-body"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="question-tags">
            <span>????????????5??</span>
            <Input
              id="question-tags"
              name="tags"
              placeholder="?????,??,????"
              data-testid="question-tags"
            />
          </label>
          <div className="flex items-center gap-4">
            <Button
              type="submit"
              onClick={() => setMode("draft")}
              disabled={loading}
              variant="secondary"
              data-testid="question-save-draft"
            >
              ?????
            </Button>
            <Button
              type="submit"
              onClick={() => setMode("queued")}
              disabled={loading}
              data-testid="question-submit"
            >
              AI????????
            </Button>
          </div>
          {error && (
            <p className="text-sm text-rose-600" role="alert" data-testid="question-error">
              {error}
            </p>
          )}
          {aiFeedback && (
            <div className="space-y-2 rounded-md bg-slate-50 p-4" data-testid="question-aicheck">
              <h3 className="text-sm font-semibold text-slate-700">AI??????</h3>
              {aiFeedback.length === 0 ? (
                <Badge tone="success" data-testid="question-aicheck-success">
                  ?????????????
                </Badge>
              ) : (
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600" data-testid="question-aicheck-issues">
                  {aiFeedback.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </form>
      </Card>
    </main>
  );
}
