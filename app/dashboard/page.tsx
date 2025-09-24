import { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ROLE_LABELS,
  RANK_LABELS,
  QUESTION_STATUS_LABELS,
  SCHOOL_PLAN_LABELS,
  BILLING_STATUS_LABELS,
  PURCHASE_ITEM_LABELS,
  PURCHASE_STATUS_LABELS,
  resolveLabel
} from "@/lib/labels";
import {
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  ChatBubbleBottomCenterTextIcon,
  ClipboardDocumentListIcon,
  CloudArrowUpIcon,
  UserGroupIcon,
  MicrophoneIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  UserCircleIcon,
  WalletIcon
} from "@heroicons/react/24/outline";

// ダッシュボード。役割ごとに必要な情報を取得して表示する。
export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/login");
  }

  const roleLabel = resolveLabel(ROLE_LABELS, currentUser.role);
  const rankLabel = resolveLabel(RANK_LABELS, currentUser.rank);
  const walletBalance = currentUser.wallet?.balance ?? 0;

  const walletCard = (
    <div className="relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white shadow-lg">
      <div className="flex items-start gap-4">
        <span className="rounded-2xl bg-white/15 p-3">
          <WalletIcon className="h-8 w-8" aria-hidden />
        </span>
        <div>
          <p className="text-sm text-white/70">ウォレット残高</p>
          <p className="mt-1 text-4xl font-semibold leading-none">{walletBalance} pt</p>
          <p className="mt-2 text-xs text-white/60">ゲスト利用時は 20 pt からスタートできます。</p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/wallet"
          className="inline-flex items-center gap-2 rounded-md bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/25"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden />
          ウォレットを開く
        </Link>
      </div>
      <span className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 rounded-full bg-white/15" />
      <span className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-white/10" />
    </div>
  );

  const resourceHubCard = (
    <Card
      title={
        <span className="flex items-center gap-2 text-slate-900">
          <CloudArrowUpIcon className="h-5 w-5 text-brand-600" aria-hidden />
          資料・モチベーション管理
        </span>
      }
      action={
        <Link
          href="/dashboard/resources"
          className="inline-flex items-center gap-2 rounded-md border border-brand-200 px-3 py-1.5 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden />
          共有スペースを開く
        </Link>
      }
    >
      <p>
        探究で活用する資料やスライドを共有し、振り返りのモチベーションづくりに役立てられます。学校メンバーへの公開と個人管理の両方に対応しています。
      </p>
      <p className="text-xs text-slate-500">アップロードするとバッジ付与の対象にもなり、活動履歴として残せます。</p>
    </Card>
  );

  let roleContent: ReactNode = null;

  if (currentUser.role === "student") {
    const questions = await prisma.question.findMany({
      where: { studentId: currentUser.id },
      orderBy: { createdAt: "desc" },
      take: 10
    });

    roleContent = (
      <>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
          {walletCard}
          <Card
            title={
              <span className="flex items-center gap-2 text-slate-900">
                <ClipboardDocumentListIcon className="h-5 w-5 text-brand-600" aria-hidden />
                最近投稿した質問
              </span>
            }
            className="h-full"
          >
            {questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                <ClipboardDocumentListIcon className="h-10 w-10 text-slate-300" aria-hidden />
                <p className="text-sm text-slate-500">
                  まだ質問がありません。まずは気になるテーマを整理してみましょう。
                </p>
                <Link
                  href="/questions/new"
                  className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
                >
                  <PlusCircleIcon className="h-4 w-4" aria-hidden />
                  新しい質問を作成
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {questions.map((q) => {
                  const statusLabel = resolveLabel(QUESTION_STATUS_LABELS, q.status);
                  return (
                    <li
                      key={q.id}
                      className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md"
                    >
                      <div className="flex flex-1 gap-3">
                        <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                          <ClipboardDocumentListIcon className="h-5 w-5" aria-hidden />
                        </span>
                        <div>
                          <Link
                            href={`/questions/${q.id}`}
                            className="font-semibold text-slate-900 transition group-hover:text-brand-600"
                          >
                            {q.title}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">ステータス: {statusLabel}</p>
                        </div>
                      </div>
                      <Badge tone={q.status === "closed" ? "success" : "default"}>{statusLabel}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
        <Card title="次のアクション">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/questions/new"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              <PlusCircleIcon className="h-5 w-5" aria-hidden />
              新しい質問を作成
            </Link>
            <Link
              href="/forum"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-200 hover:text-brand-600"
            >
              <ChatBubbleBottomCenterTextIcon className="h-5 w-5" aria-hidden />
              フォーラムを見る
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-200 hover:text-brand-600"
            >
              <UserGroupIcon className="h-5 w-5" aria-hidden />
              チャットを開く
            </Link>
            <Link
              href="/voice"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-200 hover:text-brand-600"
            >
              <MicrophoneIcon className="h-5 w-5" aria-hidden />
              ボイスルームに参加
            </Link>
          </div>
        </Card>
      </>
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
        {walletCard}
        <div className="grid gap-6">
          <Card title="担当中の質問">
            {assigned.length === 0 ? (
              <p>
                担当中の質問はありません。<Link href="/respond" className="text-brand-600">キューを確認</Link>してみてください。
              </p>
            ) : (
              <ul className="space-y-3">
                {assigned.map((q) => (
                  <li key={q.id} className="flex items-center justify-between gap-4">
                    <Link href={`/questions/${q.id}`} className="font-medium text-slate-800">
                      {q.title}
                    </Link>
                    <Badge>{resolveLabel(QUESTION_STATUS_LABELS, q.status)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="活動サマリー">
            <p>累計回答数: <span className="font-semibold">{stats}</span></p>
            <p>待機中の質問: <span className="font-semibold">{queuedCount}</span></p>
            <p>平均評価: <span className="font-semibold">{currentUser.ratingAvg.toFixed(2)}</span>（評価 {currentUser.ratingCount} 件）</p>
          </Card>
          <Card title="リアルタイム交流">
            <p className="text-sm text-slate-600">生徒と素早く打ち合わせが必要な際はボイスルームを活用しましょう。</p>
            <Link
              href="/voice"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-200 hover:text-brand-600"
            >
              <MicrophoneIcon className="h-5 w-5" aria-hidden />
              ボイスルームに移動
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  if (currentUser.role === "schoolAdmin" && currentUser.schoolId) {
    const school = await prisma.school.findUnique({
      where: { id: currentUser.schoolId },
      include: { users: true, purchases: true }
    });

    roleContent = (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
        {walletCard}
        <div className="grid gap-6">
          <Card title="学校プラン情報">
            {school ? (
              <>
                <p>プラン: <Badge>{resolveLabel(SCHOOL_PLAN_LABELS, school.plan)}</Badge></p>
                <p>
                  利用状況: 生徒 {school.users.filter((u) => u.role === "student").length} / {school.seats} 名
                </p>
                <p>請求ステータス: {resolveLabel(BILLING_STATUS_LABELS, school.billingStatus)}</p>
              </>
            ) : (
              <p>学校情報を取得できませんでした。</p>
            )}
          </Card>
          <Card title="最近の購入履歴">
            {school && school.purchases.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {school.purchases.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    {resolveLabel(PURCHASE_ITEM_LABELS, p.item)} / {p.amountJpy} 円 / {resolveLabel(PURCHASE_STATUS_LABELS, p.status)}
                  </li>
                ))}
              </ul>
            ) : (
              <p>購入履歴がまだありません。</p>
            )}
            {school && (
              <Link
                href={`/admin/schools/${school.id}`}
                className="mt-4 inline-flex items-center gap-2 rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden />
                学校設定を開く
              </Link>
            )}
          </Card>
        </div>
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
        {walletCard}
        <Card title="システム管理サマリー">
          <p>登録ユーザー数: {userCount}</p>
          <p>質問総数: {questionCount}</p>
          <p>通報件数: {reports}</p>
          <Link
            href="/admin/moderation"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden />
            モデレーション画面へ
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-12">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <span className="rounded-2xl bg-brand-50 p-4 text-brand-600">
              <UserCircleIcon className="h-12 w-12" aria-hidden />
            </span>
            <div>
              <p className="text-sm text-slate-500">ようこそ</p>
              <h1 className="text-3xl font-semibold text-slate-900">{currentUser.name} さん</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className="bg-brand-100 text-brand-700">
                  <span className="mr-1" aria-hidden>👤</span>
                  {roleLabel}
                </Badge>
                <Badge tone="success">
                  <span className="mr-1" aria-hidden>⭐</span>
                  {rankLabel}
                </Badge>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/80 px-6 py-4 text-sm text-brand-700">
            探究の進捗を素早く確認しましょう。ゲストモードでもフローを体験できます。
          </div>
        </div>
      </section>
      {resourceHubCard}
      {roleContent}
      <Card title="学習支援ツール">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <Link
            href="/dashboard/tasks"
            className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-brand-200 hover:shadow"
          >
            <span className="rounded-md bg-brand-50 p-2 text-brand-600">
              <ClipboardDocumentListIcon className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-800">タスクボード</span>
              <span className="block text-xs text-slate-500">進捗をステータスごとに整理できます</span>
            </span>
          </Link>
          <Link
            href="/dashboard/notes"
            className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-brand-200 hover:shadow"
          >
            <span className="rounded-md bg-brand-50 p-2 text-brand-600">
              <PencilSquareIcon className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-800">共同編集ノート</span>
              <span className="block text-xs text-slate-500">Markdown で学びの記録を共有しましょう</span>
            </span>
          </Link>
          <Link
            href="/chat"
            className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-brand-200 hover:shadow"
          >
            <span className="rounded-md bg-brand-50 p-2 text-brand-600">
              <UserGroupIcon className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-800">チャットルーム</span>
              <span className="block text-xs text-slate-500">クラス・タグごとの会話を一箇所で管理</span>
            </span>
          </Link>
          <Link
            href="/dashboard/calendar"
            className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-brand-200 hover:shadow"
          >
            <span className="rounded-md bg-brand-50 p-2 text-brand-600">
              <CalendarDaysIcon className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-800">カレンダー連携</span>
              <span className="block text-xs text-slate-500">Google カレンダーの予定を同期して確認</span>
            </span>
          </Link>
        </div>
      </Card>
    </main>
  );
}
