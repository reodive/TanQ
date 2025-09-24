import { PURCHASE_ITEM_LABELS, PURCHASE_STATUS_LABELS, resolveLabel } from "@/lib/labels";

type PurchaseView = {
  id: string;
  item: keyof typeof PURCHASE_ITEM_LABELS;
  amountJpy: number;
  credits: number;
  status: keyof typeof PURCHASE_STATUS_LABELS;
  createdAt: string;
};

type PurchaseHistoryProps = {
  purchases: PurchaseView[];
};

export function PurchaseHistory({ purchases }: PurchaseHistoryProps) {
  if (purchases.length === 0) {
    return <p className="text-sm text-slate-500">購入履歴がまだありません。</p>;
  }
  return (
    <ul className="divide-y divide-slate-200 text-sm">
      {purchases.map((purchase) => (
        <li key={purchase.id} className="flex flex-col gap-1 py-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">
              {resolveLabel(PURCHASE_ITEM_LABELS, purchase.item)}
            </span>
            <span className="text-sm text-slate-500">{new Date(purchase.createdAt).toLocaleString("ja-JP")}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>{purchase.amountJpy.toLocaleString()} 円</span>
            {purchase.credits > 0 && <span>{purchase.credits} pt</span>}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
              {resolveLabel(PURCHASE_STATUS_LABELS, purchase.status)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
