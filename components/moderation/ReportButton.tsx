"use client";

import { useState } from "react";
import { FlagIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

type ReportButtonProps = {
  endpoint: string;
  className?: string;
  idleLabel?: string;
  successLabel?: string;
};

export function ReportButton({ endpoint, className, idleLabel = "通報", successLabel = "通報済み" }: ReportButtonProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClick = async () => {
    if (status === "sending" || status === "success") return;
    setStatus("sending");
    setErrorMessage(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = body?.error?.message ?? "通報の送信に失敗しました";
        setErrorMessage(message);
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("通報の送信に失敗しました");
    }
  };

  const label = status === "success" ? successLabel : idleLabel;

  return (
    <div className="flex flex-col items-end gap-1 text-xs">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "sending" || status === "success"}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
      >
        <FlagIcon className="h-4 w-4" aria-hidden />
        {status === "sending" ? "送信中..." : label}
      </button>
      {status === "error" && errorMessage && <span className="text-rose-600">{errorMessage}</span>}
      {status === "success" && <span className="text-emerald-600">審査チームに通知しました</span>}
    </div>
  );
}
