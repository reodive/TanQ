import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ??????????????????????????DB????
export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/login");
  }

  let roleContent: React.ReactNode = null;

  if (currentUser.role === "student") {
    const questions = await prisma.question.findMany({
      where: { studentId: currentUser.id },
      orderBy: { createdAt: "desc" },
      take: 10
    });
    roleContent = (
      <Card title="?????">
        {questions.length === 0 ? (
          <p>???????????<Link href="/questions/new" className="text-brand-600">??????????</Link>?</p>
        ) : (
          <ul className="space-y-3">
            {questions.map((q) => (
              <li key={q.id} className="flex items-center justify-between gap-4">
                <div>
                  <Link href={`/questions/${q.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                    {q.title}
                  </Link>
                  <p className="text-xs text-slate-500">??: {q.status}</p>
                </div>
                <Badge tone={q.status === "closed" ? "success" : "default"}>{q.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    );
  }

  if (currentUser.role === "responder") {
    const [assigned, queuedCount, stats] = await Promise.all([
      prisma.question.findMany({
        where: { assignedToId: currentUser.id, status: "assigned" },
        orderBy: { createdAt: "asc" },
        take: 5
      }),
      prisma.question.count({ where: { status: "queued" } }),
      prisma.answer.count({ where: { responderId: currentUser.id } })
    ]);
    roleContent = (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="????????">
          {assigned.length === 0 ? (
            <p>???????????????<Link href="/respond" className="text-brand-600">????????</Link>??????</p>
          ) : (
            <ul className="space-y-3">
              {assigned.map((q) => (
                <li key={q.id} className="flex items-center justify-between">
                  <Link href={`/questions/${q.id}`} className="font-medium text-slate-800">
                    {q.title}
                  </Link>
                  <Badge>{q.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="??????">
          <p>?????: <span className="font-semibold">{stats}</span></p>
          <p>????????: <span className="font-semibold">{queuedCount}</span></p>
          <p>????: <span className="font-semibold">{currentUser.ratingAvg.toFixed(2)}</span>?{currentUser.ratingCount}??</p>
        </Card>
      </div>
    );
  }

  if (currentUser.role === "schoolAdmin" && currentUser.schoolId) {
    const school = await prisma.school.findUnique({
      where: { id: currentUser.schoolId },
      include: { users: true, purchases: true }
    });
    roleContent = (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="??????">
          {school ? (
            <>
              <p>?????: <Badge>{school.plan}</Badge></p>
              <p>????: ?? {school.users.filter((u) => u.role === "student").length} / {school.seats} ?</p>
              <p>????: {school.billingStatus}</p>
            </>
          ) : (
            <p>????????????????</p>
          )}
        </Card>
        <Card title="???????">
          {school && school.purchases.length > 0 ? (
            <ul className="space-y-2">
              {school.purchases.slice(0, 5).map((p) => (
                <li key={p.id} className="text-sm">
                  {p.item} / {p.amountJpy}? / {p.status}
                </li>
              ))}
            </ul>
          ) : (
            <p>?????????????</p>
          )}
          {school && (
            <Button asChild variant="secondary" className="mt-4">
              <Link href={`/admin/schools/${school.id}`}>????????</Link>
            </Button>
          )}
        </Card>
      </div>
    );
  }

  if (currentUser.role === "sysAdmin") {
    const [userCount, questionCount, reports] = await Promise.all([
      prisma.user.count(),
      prisma.question.count(),
      prisma.forumPost.count({ where: { reports: { gt: 0 } } })
    ]);
    roleContent = (
      <Card title="??????????????">
        <p>???????: {userCount}</p>
        <p>????: {questionCount}</p>
        <p>??????: {reports}</p>
        <Button asChild className="mt-4">
          <Link href="/admin/moderation">????????</Link>
        </Button>
      </Card>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">??????{currentUser.name}??</h1>
        <p className="text-slate-500">???: {currentUser.role} / ???: {currentUser.rank}</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="???????">
          <p className="text-3xl font-bold text-brand-600">{currentUser.wallet?.balance ?? 0} pt</p>
          <Button asChild variant="secondary" className="mt-4">
            <Link href="/wallet">????????</Link>
          </Button>
        </Card>
      </div>
      {roleContent}
    </main>
  );
}
