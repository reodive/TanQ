"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("グローバルエラー", error);
  }, [error]);

  return (
    <html lang="ja">
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center text-slate-700">
        <h1 className="text-2xl font-semibold text-slate-800">問題が発生しました。</h1>
        <p className="mt-3 text-sm">しばらくしてから再度お試しください。</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          再試行する
        </button>
      </body>
    </html>
  );
}
