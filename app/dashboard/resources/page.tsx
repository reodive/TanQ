import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { getMaxFileSizeBytes, isStorageConfigured } from "@/lib/storage";
import { ResourceManager } from "@/components/storage/resource-manager";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default async function ResourcesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/login");
  }

  const storageEnabled = isStorageConfigured();
  const maxFileSizeBytes = getMaxFileSizeBytes();

  let files: Array<{
    id: string;
    filename: string;
    objectKey: string;
    contentType: string | null;
    size: number | null;
    description: string | null;
    schoolId: string | null;
    storageProvider: string | null;
    createdAt: Date;
    owner: {
      id: string;
      name: string;
    };
  }> = [];

  if (storageEnabled) {
    files = await prisma.resourceFile.findMany({
      where: {
        OR: [
          { ownerId: currentUser.id },
          ...(currentUser.schoolId ? [{ schoolId: currentUser.schoolId }] : [])
        ]
      },
      include: {
        owner: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  const initialFiles = files.map((file) => ({
    id: file.id,
    filename: file.filename,
    contentType: file.contentType,
    size: file.size,
    description: file.description,
    createdAt: file.createdAt.toISOString(),
    owner: file.owner,
    schoolId: file.schoolId,
    storageProvider: file.storageProvider ?? "s3"
  }));

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-4">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden />
          ダッシュボードへ戻る
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">資料・モチベーション管理</h1>
          <p className="mt-2 text-sm text-slate-600">
            チームで共有したい資料をアップロードし、探究のモチベーションを高めましょう。学校メンバーでの共有と個人管理の両方に対応しています。
          </p>
        </div>
      </div>
      <ResourceManager
        initialFiles={initialFiles}
        storageEnabled={storageEnabled}
        currentUser={{ id: currentUser.id, role: currentUser.role, schoolId: currentUser.schoolId ?? null }}
        maxFileSizeMb={maxFileSizeBytes / (1024 * 1024)}
      />
    </main>
  );
}
