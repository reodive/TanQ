import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// ???????????
export default async function RespondPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "responder") {
    redirect("/dashboard");
  }

  const queued = await prisma.question.findMany({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
    take: 10,
    include: {
      student: true
    }
  });

  async function claim(questionId: string) {
    "use server";
    const user = await getCurrentUser();
    if (!user || user.role !== "responder") return;
    await prisma.question.update({
      where: { id: questionId },
      data: {
        status: "assigned",
        assignedToId: user.id,
        assignedAt: new Date()
      }
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12" data-testid="respond-page">
      <Card title="???????" data-testid="respond-card">
        {queued.length === 0 ? (
          <p data-testid="respond-empty">???????????????</p>
        ) : (
          <ul className="space-y-4" data-testid="respond-list">
            {queued.map((q) => (
              <li key={q.id} className="rounded-md border border-slate-200 p-4" data-testid="respond-item">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Link
                      href={`/questions/${q.id}`}
                      className="text-lg font-semibold text-slate-800"
                      data-testid="respond-item-title"
                    >
                      {q.title}
                    </Link>
                    <p className="text-xs text-slate-500" data-testid="respond-item-student">
                      ???: {q.student.name}
                    </p>
                  </div>
                  <form action={async () => claim(q.id)} data-testid="respond-claim-form">
                    <Button type="submit" data-testid="respond-claim-button">
                      ????
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
