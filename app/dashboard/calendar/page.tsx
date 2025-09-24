import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { CalendarPanel } from "@/components/calendar/calendar-panel";

type SearchParams = Record<string, string | string[]>;

export default async function CalendarPage({ searchParams }: { searchParams?: SearchParams }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/login");
  }

  const credential = await prisma.calendarCredential.findUnique({ where: { userId: currentUser.id } });
  const events = credential
    ? await prisma.calendarEvent.findMany({
        where: { userId: currentUser.id },
        orderBy: { startTime: "asc" }
      })
    : [];

  const serialized = events.map((event) => ({
    id: event.id,
    summary: event.summary,
    description: event.description,
    htmlLink: event.htmlLink,
    startTime: event.startTime ? event.startTime.toISOString() : null,
    endTime: event.endTime ? event.endTime.toISOString() : null,
    syncedAt: event.syncedAt.toISOString()
  }));

  const params = searchParams ?? {};
  const hasSyncWarning = params["sync"] === "failed";
  const initialMessage = params["connected"] === "1" ? "Google カレンダーと連携しました" : null;
  let initialError: string | null = null;
  if (params["error"]) {
    initialError = "Google カレンダーとの連携に失敗しました。もう一度お試しください。";
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <header className="space-y-1">
        <p className="text-sm font-medium text-brand-600">学習サポート</p>
        <h1 className="text-3xl font-semibold text-slate-900">カレンダー連携</h1>
        <p className="text-sm text-slate-500">
          Google カレンダーと連携して探究活動の予定を一覧できます。同期はいつでも更新できます。
        </p>
      </header>
      <CalendarPanel
        isConnected={Boolean(credential)}
        initialEvents={serialized}
        hasSyncWarning={hasSyncWarning}
        initialMessage={initialMessage}
        initialError={initialError}
      />
    </main>
  );
}
