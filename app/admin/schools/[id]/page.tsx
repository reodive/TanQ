import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BillingStatus, SchoolPlan } from "@prisma/client";
import {
  ROLE_LABELS,
  SCHOOL_PLAN_LABELS,
  BILLING_STATUS_LABELS,
  PURCHASE_ITEM_LABELS,
  PURCHASE_STATUS_LABELS,
  resolveLabel
} from "@/lib/labels";

// 学校の契約情報と設定を管理するページ。
export default async function AdminSchoolPage({ params }: { params: { id: string } }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/login");
  }
  const canView =
    currentUser.role === "sysAdmin" ||
    (currentUser.role === "schoolAdmin" && currentUser.schoolId === params.id);
  if (!canView) {
    redirect("/dashboard");
  }

  const school = await prisma.school.findUnique({
    where: { id: params.id },
    include: {
      users: true,
      purchases: {
        orderBy: { createdAt: "desc" }
      }
    }
  });
  if (!school) {
    redirect("/dashboard");
  }

  async function updateSchool(formData: FormData) {
    "use server";
    const user = await getCurrentUser();
    if (!user) return;
    const allowed = user.role === "sysAdmin" || (user.role === "schoolAdmin" && user.schoolId === params.id);
    if (!allowed) return;
    const planEntry = formData.get("plan");
    const plan =
      typeof planEntry === "string" && (Object.values(SchoolPlan) as string[]).includes(planEntry)
        ? (planEntry as SchoolPlan)
        : undefined;

    const seatsEntry = formData.get("seats");
    const seats = typeof seatsEntry === "string" && seatsEntry.trim() !== "" ? Number(seatsEntry) : undefined;

    const billingEntry = formData.get("billingStatus");
    const billingStatus =
      typeof billingEntry === "string" && (Object.values(BillingStatus) as string[]).includes(billingEntry)
        ? (billingEntry as BillingStatus)
        : undefined;

    const seatsValue = typeof seats === "number" && Number.isFinite(seats) && seats > 0 ? Math.trunc(seats) : undefined;
    await prisma.school.update({
      where: { id: params.id },
      data: {
        plan,
        seats: seatsValue,
        billingStatus
      }
    });
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <Card title={`学校: ${school.name}`}>
        <p>プラン: <Badge>{resolveLabel(SCHOOL_PLAN_LABELS, school.plan)}</Badge></p>
        <p>座席数: {school.seats}</p>
        <p>請求ステータス: {resolveLabel(BILLING_STATUS_LABELS, school.billingStatus)}</p>
      </Card>
      <Card title="設定を更新">
        <form action={updateSchool} className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1 text-sm text-slate-700">
            <span>プラン</span>
            <select
              name="plan"
              defaultValue={school.plan}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="free">フリー</option>
              <option value="starter">スターター</option>
              <option value="growth">グロース</option>
              <option value="enterprise">エンタープライズ</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>座席数</span>
            <input
              type="number"
              name="seats"
              min={1}
              defaultValue={school.seats}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>請求ステータス</span>
            <select
              name="billingStatus"
              defaultValue={school.billingStatus}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="trial">お試し中</option>
              <option value="active">有効</option>
              <option value="delinquent">支払い遅延</option>
              <option value="suspended">停止中</option>
              <option value="cancelled">解約済み</option>
            </select>
          </label>
          <button type="submit" className="col-span-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white">
            保存する
          </button>
        </form>
      </Card>
      <Card title="所属ユーザー">
        <ul className="space-y-2 text-sm text-slate-700">
          {school.users.map((user) => (
            <li key={user.id}>
              {user.name} / {user.email} / {resolveLabel(ROLE_LABELS, user.role)}
            </li>
          ))}
        </ul>
      </Card>
      <Card title="購入履歴">
        <ul className="space-y-2 text-sm text-slate-700">
          {school.purchases.map((purchase) => (
            <li key={purchase.id}>
              {resolveLabel(PURCHASE_ITEM_LABELS, purchase.item)} / {purchase.amountJpy} 円 / {resolveLabel(PURCHASE_STATUS_LABELS, purchase.status)} / {new Date(purchase.createdAt).toLocaleDateString("ja-JP")}
            </li>
          ))}
          {school.purchases.length === 0 && <li>購入履歴はありません。</li>}
        </ul>
      </Card>
    </main>
  );
}
