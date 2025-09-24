"use client";

import { CreditTxn } from "@prisma/client";
import { CREDIT_TXN_TYPE_LABELS, resolveLabel } from "@/lib/labels";

// ウォレットの取引履歴を表示するテーブル。
export function TransactionsTable({ txns, currentBalance }: { txns: CreditTxn[]; currentBalance: number }) {
  if (txns.length === 0) {
    return <p className="text-sm text-slate-500" data-testid="transactions-empty">取引履歴はまだありません。</p>;
  }

  const ordered = [...txns].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  let running = currentBalance;
  const rows = ordered.map((txn) => {
    const row = { txn, balanceAfter: running };
    running -= txn.delta;
    return row;
  });

  return (
    <table className="min-w-full divide-y divide-slate-200 text-sm" data-testid="transactions-table">
      <thead>
        <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <th className="px-3 py-2">日時</th>
          <th className="px-3 py-2">種別</th>
          <th className="px-3 py-2 text-right">増減</th>
          <th className="px-3 py-2 text-right">残高</th>
          <th className="px-3 py-2">メモ</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 text-slate-700">
        {rows.map(({ txn, balanceAfter }) => (
          <tr key={txn.id} data-testid="transaction-row">
            <td className="px-3 py-2">{new Date(txn.createdAt).toLocaleString("ja-JP")}</td>
            <td className="px-3 py-2" data-testid="transaction-type">
              {resolveLabel(CREDIT_TXN_TYPE_LABELS, txn.type)}
            </td>
            <td className="px-3 py-2 text-right" data-testid="transaction-delta">
              {txn.delta > 0 ? `+${txn.delta}` : txn.delta}
            </td>
            <td className="px-3 py-2 text-right" data-testid="transaction-balance">
              {balanceAfter}
            </td>
            <td className="px-3 py-2">{txn.memo ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
