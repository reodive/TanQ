"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowPathIcon, ArrowDownTrayIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ReportButton } from "@/components/moderation/ReportButton";

type Role = "student" | "responder" | "schoolAdmin" | "sysAdmin";

type ResourceOwner = {
  id: string;
  name: string;
};

type ResourceItem = {
  id: string;
  filename: string;
  contentType: string | null;
  size: number | null;
  description: string | null;
  createdAt: string;
  owner: ResourceOwner;
  schoolId: string | null;
  storageProvider: string | null;
};

type ResourceManagerProps = {
  initialFiles: ResourceItem[];
  storageEnabled: boolean;
  currentUser: {
    id: string;
    role: Role;
    schoolId: string | null;
  };
  maxFileSizeMb: number;
};

function formatBytes(value: number | null) {
  if (value == null || Number.isNaN(value)) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("ja-JP");
  } catch {
    return value;
  }
}

export function ResourceManager({ initialFiles, storageEnabled, currentUser, maxFileSizeMb }: ResourceManagerProps) {
  const [files, setFiles] = useState<ResourceItem[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const canShareWithSchool = Boolean(currentUser.schoolId);
  const fileLimitLabel = Math.round((maxFileSizeMb + Number.EPSILON) * 10) / 10;

  const hasManagePermission = (item: ResourceItem) => {
    if (item.owner.id === currentUser.id) return true;
    if (currentUser.role === "sysAdmin") return true;
    if (currentUser.role === "schoolAdmin" && item.schoolId && currentUser.schoolId === item.schoolId) {
      return true;
    }
    return false;
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUploadError(null);
    if (!storageEnabled) {
      setUploadError("ストレージが無効化されています");
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setUploadError("ファイルを選択してください");
      return;
    }
    setUploading(true);
    try {
      const res = await fetch("/api/storage", {
        method: "POST",
        body: data
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        const message = body?.error?.message ?? "アップロードに失敗しました";
        setUploadError(message);
        return;
      }
      const fileData: ResourceItem | undefined = body?.data?.file;
      if (!fileData) {
        setUploadError("アップロード結果を取得できませんでした");
        return;
      }
      setFiles((prev) => [fileData, ...prev]);
      form.reset();
    } catch {
      setUploadError("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      const res = await fetch(`/api/storage/${id}/download`);
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        alert(body?.error?.message ?? "ダウンロードリンクを取得できませんでした");
        return;
      }
      const url: string | undefined = body.data.url;
      if (url) {
        window.open(url, "_blank", "noopener");
      }
    } catch {
      alert("ダウンロードに失敗しました");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/storage/${id}`, {
        method: "DELETE"
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        alert(body?.error?.message ?? "削除に失敗しました");
        return;
      }
      setFiles((prev) => prev.filter((item) => item.id !== id));
    } catch {
      alert("削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  const refreshList = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/storage");
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        alert(body?.error?.message ?? "更新に失敗しました");
        return;
      }
      const nextFiles: ResourceItem[] = body?.data?.files ?? [];
      setFiles(nextFiles);
    } catch {
      alert("更新に失敗しました");
    } finally {
      setRefreshing(false);
    }
  };

  const grouped = useMemo(() => {
    return files.map((file) => ({
      ...file,
      scope: file.schoolId ? "学校共有" : "個人保管"
    }));
  }, [files]);

  if (!storageEnabled) {
    return (
      <Card title="ファイル共有スペース">
        <p>現在ストレージ接続が設定されていません。環境変数 <code>STORAGE_BUCKET</code> などを設定すると利用できます。</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="資料をアップロード">
        <form className="space-y-4" onSubmit={handleUpload}>
          <div className="flex flex-col gap-2 text-sm">
            <label className="font-medium text-slate-700">ファイル</label>
            <input
              type="file"
              name="file"
              accept="application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="text-sm"
              required
            />
            <p className="text-xs text-slate-500">PDF やスライドを共有できます。上限 {fileLimitLabel}MB。</p>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <label className="font-medium text-slate-700" htmlFor="description">メモ</label>
            <textarea id="description" name="description" rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm" placeholder="共有意図や参考ポイントを記載しましょう" />
          </div>
          {canShareWithSchool && (
            <div className="flex flex-col gap-2 text-sm">
              <label className="font-medium text-slate-700" htmlFor="scope">共有範囲</label>
              <select id="scope" name="scope" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm" defaultValue="school">
                <option value="school">学校メンバーと共有</option>
                <option value="personal">自分のみ</option>
              </select>
            </div>
          )}
          {!canShareWithSchool && <input type="hidden" name="scope" value="personal" />}
          {uploadError && <p className="text-sm text-rose-600">{uploadError}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={uploading}>
              {uploading ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  アップロード中...
                </span>
              ) : (
                "アップロード"
              )}
            </Button>
            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700"
              onClick={refreshList}
              disabled={refreshing}
            >
              {refreshing ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ArrowPathIcon className="h-4 w-4" />}
              最新の状態に更新
            </button>
          </div>
        </form>
      </Card>

      <Card title="共有中の資料" action={<span className="text-xs text-slate-500">{grouped.length} 件</span>}>
        {grouped.length === 0 ? (
          <p className="text-sm text-slate-500">まだアップロードされた資料はありません。</p>
        ) : (
          <div className="-mx-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">ファイル名</th>
                  <th className="px-4 py-3 text-left">共有範囲</th>
                  <th className="px-4 py-3 text-left">アップロード者</th>
                  <th className="px-4 py-3 text-right">サイズ</th>
                  <th className="px-4 py-3 text-left">登録日</th>
                  <th className="px-4 py-3 text-left">メモ</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grouped.map((file) => {
                  const allowManage = hasManagePermission(file);
                  return (
                    <tr key={file.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{file.filename}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold",
                          file.schoolId ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {file.scope}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{file.owner.name}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatBytes(file.size)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(file.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs">
                        {file.description ? <span className="line-clamp-2">{file.description}</span> : <span className="text-slate-400">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                            onClick={() => handleDownload(file.id)}
                            disabled={downloadingId === file.id}
                          >
                            {downloadingId === file.id ? <Spinner size="sm" /> : <ArrowDownTrayIcon className="h-4 w-4" aria-hidden />}
                            ダウンロード
                          </button>
                          {allowManage && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                              onClick={() => handleDelete(file.id)}
                              disabled={deletingId === file.id}
                            >
                              {deletingId === file.id ? <Spinner size="sm" /> : <TrashIcon className="h-4 w-4" aria-hidden />} 
                              削除
                            </button>
                          )}
                          <ReportButton
                            endpoint={`/api/storage/${file.id}/report`}
                            idleLabel="通報"
                            successLabel="通報済み"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
