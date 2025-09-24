import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccountCreateForm } from "./AccountCreateForm";
import { DeleteAccountButton } from "./DeleteAccountButton";
import { ROLE_LABELS, resolveLabel } from "@/lib/labels";

const NAV_SYS_ADMINS = "sysAdmins";
const NAV_UNASSIGNED = "unassigned";

type PageProps = {
  searchParams: {
    schoolId?: string;
  };
};

type SchoolNavItem = {
  id: string;
  name: string;
  count: number;
};

export default async function AdminAccountsPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "sysAdmin") {
    redirect("/dashboard");
  }

  const [schools, sysAdmins, unassignedUsers] = await Promise.all([
    prisma.school.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { users: true }
        }
      }
    }),
    prisma.user.findMany({
      where: { role: "sysAdmin" },
      orderBy: { createdAt: "desc" }
    }),
    prisma.user.findMany({
      where: { schoolId: null, role: { not: "sysAdmin" } },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const navItems: SchoolNavItem[] = [
    { id: NAV_SYS_ADMINS, name: "システム管理者", count: sysAdmins.length },
    ...schools.map((school) => ({
      id: school.id,
      name: school.name,
      count: school._count.users
    })),
    { id: NAV_UNASSIGNED, name: "学校未所属", count: unassignedUsers.length }
  ];

  const selectedId =
    searchParams.schoolId && navItems.some((item) => item.id === searchParams.schoolId)
      ? searchParams.schoolId
      : navItems[0]?.id;

  let users = sysAdmins;
  let title = "システム管理者アカウント";
  let subtitle = "プラットフォーム全体を管理するアカウントの一覧です。";

  if (selectedId && selectedId !== NAV_SYS_ADMINS) {
    if (selectedId === NAV_UNASSIGNED) {
      users = unassignedUsers;
      title = "学校未所属のアカウント";
      subtitle = "所属先が未設定のアカウントです。学校を割り当てて整理しましょう。";
    } else {
      const school = schools.find((s) => s.id === selectedId);
      if (school) {
        title = `${school.name} のアカウント`;
        subtitle = `ユーザー数: ${school._count.users} 名`;
        users = await prisma.user.findMany({
          where: { schoolId: school.id },
          orderBy: { createdAt: "desc" }
        });
      }
    }
  }

  const schoolOptions = schools.map((school) => ({ id: school.id, name: school.name }));

  const defaultSchoolForForm =
    selectedId && selectedId !== NAV_SYS_ADMINS && selectedId !== NAV_UNASSIGNED ? selectedId : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">アカウント管理</h1>
        <p className="text-sm text-slate-500">
          学校ごとのユーザーを確認し、新規作成や削除を行います。ゲスト環境を分けたい場合は後でゲストアクセスを無効化してください。
        </p>
      </header>

      <Card title="学校で絞り込み">
        <nav className="flex flex-wrap gap-2 text-sm">
          {navItems.map((item) => {
            const isActive = item.id === selectedId;
            const href = item.id === NAV_SYS_ADMINS ? "/admin/accounts" : `/admin/accounts?schoolId=${item.id}`;
            return (
              <Link
                key={item.id}
                href={href}
                className={`rounded-full border px-3 py-1 ${
                  isActive
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600"
                }`}
              >
                {item.name}
                <span className="ml-2 text-xs text-slate-400">{item.count}</span>
              </Link>
            );
          })}
        </nav>
      </Card>

      <Card title="アカウントを新規作成">
        <p className="text-sm text-slate-500">パスワードを空欄にすると仮パスワードを自動発行します。</p>
        <AccountCreateForm schoolOptions={schoolOptions} defaultSchoolId={defaultSchoolForForm} />
      </Card>

      <Card title={title}>
        <p className="text-sm text-slate-500">{subtitle}</p>
        {users.length === 0 ? (
          <p className="text-sm text-slate-500">アカウントは見つかりませんでした。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">氏名</th>
                  <th className="px-3 py-2">メールアドレス</th>
                  <th className="px-3 py-2">役割</th>
                  <th className="px-3 py-2">作成日</th>
                  <th className="px-3 py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-3 py-2 font-medium text-slate-800">{user.name}</td>
                    <td className="px-3 py-2">{user.email}</td>
                    <td className="px-3 py-2">
                      <Badge>{resolveLabel(ROLE_LABELS, user.role)}</Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      })}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <DeleteAccountButton
                        userId={user.id}
                        schoolId={selectedId && selectedId !== NAV_SYS_ADMINS ? selectedId : undefined}
                        disabled={user.id === currentUser.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}
