"use client";

import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// クレジット購入フォーム。簡易的なモック API を呼び出す。
export function PurchaseForm() {
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
      item: form.get("item"),
      amountJpy: Number(form.get("amountJpy")),
      credits: Number(form.get("credits"))
    };
    try {
      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "購入処理に失敗しました");
      }
      setMessage("購入が完了しました。ウォレット残高を更新しました。");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "購入処理に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit} data-testid="purchase-form">
      <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="purchase-item">
        <span>購入対象</span>
        <select
          id="purchase-item"
          name="item"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          data-testid="purchase-item"
        >
          <option value="credits">追加クレジット</option>
          <option value="plan">プラン契約</option>
        </select>
      </label>
      <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="purchase-amount">
        <span>決済金額（円）</span>
        <Input
          id="purchase-amount"
          type="number"
          name="amountJpy"
          min={1000}
          step={500}
          defaultValue={1000}
          required
          aria-required="true"
          data-testid="purchase-amount"
        />
      </label>
      <label className="space-y-1 text-sm font-medium text-slate-700" htmlFor="purchase-credits">
        <span>付与するクレジット数</span>
        <Input
          id="purchase-credits"
          type="number"
          name="credits"
          min={0}
          step={1}
          defaultValue={10}
          required
          aria-required="true"
          data-testid="purchase-credits"
        />
      </label>
      {error && <p className="text-sm text-rose-600" role="alert" data-testid="purchase-error">{error}</p>}
      {message && <p className="text-sm text-emerald-600" data-testid="purchase-success">{message}</p>}
      <Button type="submit" disabled={loading} className="w-full" data-testid="purchase-submit">
        {loading ? "送信中..." : "購入する"}
      </Button>
    </form>
  );
}
