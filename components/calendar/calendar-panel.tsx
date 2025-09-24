"use client";

import { useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { ja } from "date-fns/locale";
import { Card } from "@/components/ui/card";

export type CalendarEvent = {
  id: string;
  summary: string | null;
  description: string | null;
  htmlLink: string | null;
  startTime: string | null;
  endTime: string | null;
  syncedAt: string;
};

type CalendarPanelProps = {
  isConnected: boolean;
  initialEvents: CalendarEvent[];
  hasSyncWarning: boolean;
  initialMessage?: string | null;
  initialError?: string | null;
};

function formatEventDate(start: string | null, end: string | null) {
  if (!start) return "日程未定";
  const startDate = parseISO(start);
  if (!isValid(startDate)) return "日程未定";
  const startStr = format(startDate, "M月d日 (EEE) HH:mm", { locale: ja });
  if (!end) return startStr;
  const endDate = parseISO(end);
  if (!isValid(endDate)) return startStr;
  const sameDay = startDate.toDateString() === endDate.toDateString();
  const endStr = format(endDate, sameDay ? "HH:mm" : "M月d日 (EEE) HH:mm", { locale: ja });
  return `${startStr} - ${endStr}`;
}

export function CalendarPanel({ isConnected, initialEvents, hasSyncWarning, initialMessage, initialError }: CalendarPanelProps) {
  const [events, setEvents] = useState(initialEvents);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(initialMessage ?? null);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function startOAuth() {
    setError(null);
    try {
      const res = await fetch("/api/calendar/oauth/start");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? "認証 URL の取得に失敗しました");
      }
      const data = await res.json();
      const url = data.data.authUrl as string;
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google OAuth の開始に失敗しました");
    }
  }

  async function syncEvents() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? "カレンダーの同期に失敗しました");
      }
      const data = await res.json();
      setEvents(data.data.events as CalendarEvent[]);
      setMessage("最新の予定を取得しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "カレンダーの同期に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Google カレンダー連携">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isConnected ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
            {isConnected ? "連携済み" : "未連携"}
          </span>
          {isConnected ? (
            <button
              type="button"
              onClick={() => void syncEvents()}
              disabled={loading}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "同期中..." : "予定を再同期"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startOAuth()}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              Google カレンダーと連携する
            </button>
          )}
          {message && <span className="text-xs text-emerald-600">{message}</span>}
          {(error || hasSyncWarning) && (
            <span className="text-xs text-red-600">
              {error ?? "予定の取得に問題がありました。再同期してください。"}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500">
          OAuth で連携すると、Google カレンダーの予定を TanQ 内でも確認できます。同期は必要に応じて手動で更新できます。
        </p>
      </Card>

      <Card title="次の予定">
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">表示できる予定がありません。Google カレンダーと連携して予定を同期しましょう。</p>
        ) : (
          <ul className="space-y-4">
            {events.map((event) => (
              <li key={event.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800">{event.summary ?? "(タイトルなし)"}</h3>
                <p className="text-xs text-slate-500">{formatEventDate(event.startTime, event.endTime)}</p>
                {event.description && <p className="mt-2 text-xs text-slate-500 line-clamp-3">{event.description}</p>}
                {event.htmlLink && (
                  <a
                    href={event.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex text-xs font-medium text-brand-600 hover:underline"
                  >
                    Google カレンダーで開く
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
