import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ???????????????
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
    const plan = formData.get("plan") as string | null;
    const seats = Number(formData.get("seats"));
    const billingStatus = formData.get("billingStatus") as string | null;
    await prisma.school.update({
      where: { id: params.id },
      data: {
        plan: plan ?? undefined,
        seats: Number.isFinite(seats) ? seats : undefined,
        billingStatus: billingStatus ?? undefined
      }
    });
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <Card title={`???: ${school.name}`}>
        <p>???: <Badge>{school.plan}</Badge></p>
        <p>???: {school.seats}</p>
        <p>????: {school.billingStatus}</p>
      </Card>
      <Card title="????????">
        <form action={updateSchool} className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1 text-sm text-slate-700">
            <span>???</span>
            <select
              name="plan"
              defaultValue={school.plan}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="free">free</option>
              <option value="starter">starter</option>
              <option value="growth">growth</option>
              <option value="enterprise">enterprise</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>???</span>
            <input
              type="number"
              name="seats"
              min={1}
              defaultValue={school.seats}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>????</span>
            <select
              name="billingStatus"
              defaultValue={school.billingStatus}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="trial">trial</option>
              <option value="active">active</option>
              <option value="delinquent">delinquent</option>
              <option value="suspended">suspended</option>
              <option value="cancelled">cancelled</option>
            </select>
          </label>
          <button type="submit" className="col-span-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white">
            ????
          </button>
        </form>
      </Card>
      <Card title="??????">
        <ul className="space-y-2 text-sm text-slate-700">
          {school.users.map((user) => (
            <li key={user.id}>
              {user.name} / {user.email} / {user.role}
            </li>
          ))}
        </ul>
      </Card>
      <Card title="????">
        <ul className="space-y-2 text-sm text-slate-700">
          {school.purchases.map((purchase) => (
            <li key={purchase.id}>
              {purchase.item} / {purchase.amountJpy}? / {purchase.status} / {new Date(purchase.createdAt).toLocaleDateString("ja-JP")}
            </li>
          ))}
          {school.purchases.length === 0 && <li>???????????</li>}
        </ul>
      </Card>
    </main>
  );
}
