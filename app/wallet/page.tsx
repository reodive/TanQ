import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ensureWallet } from "@/lib/credits";
import { getCurrentUser } from "@/lib/server-auth";
import { Card } from "@/components/ui/card";
import { Badge as UiBadge } from "@/components/ui/badge";
import { TransactionsTable } from "@/components/wallet/transactions-table";
import { PurchaseForm } from "@/components/wallet/purchase-form";
import { BalanceChart, type BalancePoint } from "@/components/wallet/balance-chart";
import { PurchaseHistory } from "@/components/wallet/purchase-history";
import { BadgeGrid } from "@/components/badges/badge-grid";
import { RANK_LABELS, resolveLabel } from "@/lib/labels";

// ウォレット残高と購入フローに可視化を加えたページ。
export default async function WalletPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/login");
  }

  await ensureWallet(currentUser.id);

  const [wallet, purchases, badgeAwards] = await Promise.all([
    prisma.creditWallet.findUnique({
      where: { userId: currentUser.id },
      include: {
        txns: {
          orderBy: { createdAt: "desc" },
          take: 50
        }
      }
    }),
    prisma.purchase.findMany({
      where: { userId: currentUser.id },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.userBadge.findMany({
      where: { userId: currentUser.id },
      include: { badge: true },
      orderBy: { awardedAt: "desc" },
      take: 8
    })
  ]);

  const balance = wallet?.balance ?? 0;
  const txns = wallet?.txns ?? [];
  const sortedAsc = [...txns].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const totalDelta = sortedAsc.reduce((sum, txn) => sum + txn.delta, 0);
  const baseBalance = balance - totalDelta;

  const chartPoints: BalancePoint[] = [];
  if (sortedAsc.length === 0) {
    chartPoints.push({ date: new Date().toISOString(), balance });
  } else {
    const firstTime = new Date(sortedAsc[0].createdAt).getTime();
    chartPoints.push({ date: new Date(firstTime - 1000).toISOString(), balance: baseBalance });
    let running = baseBalance;
    for (const txn of sortedAsc) {
      running += txn.delta;
      chartPoints.push({ date: txn.createdAt.toISOString(), balance: running });
    }
    chartPoints.push({ date: new Date().toISOString(), balance });
  }

  const totalEarned = txns.filter((txn) => txn.delta > 0).reduce((sum, txn) => sum + txn.delta, 0);
  const totalConsumed = txns.filter((txn) => txn.delta < 0).reduce((sum, txn) => sum + Math.abs(txn.delta), 0);
  const lastTxnDate = txns.length ? new Date(txns[0].createdAt).toLocaleString("ja-JP") : "取引履歴なし";

  const purchaseViews = purchases.map((purchase) => ({
    id: purchase.id,
    item: purchase.item,
    amountJpy: purchase.amountJpy,
    credits: purchase.credits,
    status: purchase.status,
    createdAt: purchase.createdAt.toISOString()
  }));

  const badgeViews = badgeAwards.map((award) => ({
    id: award.id,
    code: award.badge.code,
    name: award.badge.name,
    description: award.badge.description,
    icon: award.badge.icon,
    reason: award.reason,
    awardedAt: award.awardedAt.toISOString()
  }));

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12" data-testid="wallet-page">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Card title="ウォレット概要" data-testid="wallet-balance-card">
          <div className="space-y-4">
            <div>
              <p className="text-4xl font-bold text-brand-600" data-testid="wallet-balance">
                {balance} pt
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span>
                  ランク: <UiBadge data-testid="wallet-rank">{resolveLabel(RANK_LABELS, currentUser.rank)}</UiBadge>
                </span>
                <span className="text-xs text-slate-400">最終更新: {lastTxnDate}</span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 text-sm text-slate-600">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">累計獲得</p>
                <p className="mt-1 text-lg font-semibold text-brand-600">{totalEarned} pt</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">累計消費</p>
                <p className="mt-1 text-lg font-semibold text-rose-500">-{totalConsumed} pt</p>
              </div>
            </div>
            <BalanceChart points={chartPoints} />
          </div>
        </Card>
        <Card title="獲得バッジ">
          <BadgeGrid badges={badgeViews} />
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Card title="クレジットを購入" data-testid="wallet-purchase-card">
          <PurchaseForm />
        </Card>
        <Card title="購入履歴">
          <PurchaseHistory purchases={purchaseViews} />
        </Card>
      </div>
      <Card title="取引履歴" data-testid="wallet-transactions-card">
        <TransactionsTable txns={txns} currentBalance={balance} />
      </Card>
    </main>
  );
}
