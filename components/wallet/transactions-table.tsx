"use client";

import { CreditTxn } from "@prisma/client";

// ????????????????
export function TransactionsTable({ txns }: { txns: CreditTxn[] }) {
  if (txns.length === 0) {
    return <p className="text-sm text-slate-500" data-testid="transactions-empty">?????????????</p>;
  }
  return (
    <table className="min-w-full divide-y divide-slate-200 text-sm" data-testid="transactions-table">
      <thead>
        <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <th className="px-3 py-2">??</th>
          <th className="px-3 py-2">??</th>
          <th className="px-3 py-2 text-right">??</th>
          <th className="px-3 py-2">??</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 text-slate-700">
        {txns.map((txn) => (
          <tr key={txn.id} data-testid="transaction-row">
            <td className="px-3 py-2">{new Date(txn.createdAt).toLocaleString("ja-JP")}</td>
            <td className="px-3 py-2" data-testid="transaction-type">{txn.type}</td>
            <td className="px-3 py-2 text-right" data-testid="transaction-delta">
              {txn.delta > 0 ? `+${txn.delta}` : txn.delta}
            </td>
            <td className="px-3 py-2">{txn.memo ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
