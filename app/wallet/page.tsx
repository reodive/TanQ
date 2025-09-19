import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TransactionsTable } from "@/components/wallet/transactions-table";
import { PurchaseForm } from "@/components/wallet/purchase-form";

// ????????????????????
export default async function WalletPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/login");
  }
  const wallet = await prisma.creditWallet.findUnique({
    where: { userId: currentUser.id },
    include: {
      txns: {
        orderBy: { createdAt: "desc" },
        take: 20
      }
    }
  });

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12" data-testid="wallet-page">
      <Card title="???????" data-testid="wallet-balance-card">
        <p className="text-4xl font-bold text-brand-600" data-testid="wallet-balance">
          {wallet?.balance ?? 0} pt
        </p>
        <p className="text-sm text-slate-500">
          ???: <Badge data-testid="wallet-rank">{currentUser.rank}</Badge>
        </p>
      </Card>
      <Card title="????????????" data-testid="wallet-purchase-card">
        <PurchaseForm />
      </Card>
      <Card title="?????" data-testid="wallet-transactions-card">
        <TransactionsTable txns={wallet?.txns ?? []} />
      </Card>
    </main>
  );
}
