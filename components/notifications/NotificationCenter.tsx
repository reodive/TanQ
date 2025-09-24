"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { RealtimeNotification } from "@/lib/realtime/types";

const DISPLAY_DURATION_MS = 8000;

type ToastItem = {
  id: string;
  event: RealtimeNotification;
};

function formatPreview(text: string) {
  if (text.length <= 120) return text;
  return `${text.slice(0, 117)}…`;
}

export default function NotificationCenter() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dismissTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const clearDisconnectTimer = useCallback(() => {
    const timer = reconnectTimerRef.current;
    if (timer) {
      clearTimeout(timer);
      reconnectTimerRef.current = null;
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = dismissTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      dismissTimersRef.current.delete(id);
    }
  }, []);

  const scheduleRemoval = useCallback(
    (id: string) => {
      if (dismissTimersRef.current.has(id)) return;
      const timer = setTimeout(() => removeToast(id), DISPLAY_DURATION_MS);
      dismissTimersRef.current.set(id, timer);
    },
    [removeToast]
  );

  const pushToast = useCallback(
    (event: RealtimeNotification) => {
      if (event.type === "connected") {
        return;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, event }]);
      scheduleRemoval(id);
    },
    [scheduleRemoval]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasToken = document.cookie.includes("tanq_token=");
    if (!hasToken) {
      return;
    }

    let active = true;

    const connect = () => {
      clearDisconnectTimer();
      if (!active) return;
      const source = new EventSource("/api/realtime/notifications");
      eventSourceRef.current = source;

      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as RealtimeNotification;
          pushToast(payload);
        } catch (err) {
          console.warn("通知のパースに失敗しました", err);
        }
      };

      source.onerror = () => {
        source.close();
        eventSourceRef.current = null;
        if (!document.cookie.includes("tanq_token=")) {
          active = false;
          return;
        }
        clearDisconnectTimer();
        reconnectTimerRef.current = setTimeout(connect, 5000);
      };
    };

    connect();

    const dismissTimersSnapshot = dismissTimersRef.current;

    return () => {
      active = false;
      clearDisconnectTimer();
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      dismissTimersSnapshot.forEach((timer) => clearTimeout(timer));
      dismissTimersSnapshot.clear();
    };
  }, [clearDisconnectTimer, pushToast]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col gap-3">
      {toasts.map(({ id, event }) => {
        if (event.type === "direct_message") {
          return (
            <article
              key={id}
              className="pointer-events-auto rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">新着メッセージ</p>
                  <p className="mt-1 text-xs text-slate-500">{event.sender.name} から</p>
                </div>
                <button
                  type="button"
                  aria-label="閉じる"
                  onClick={() => removeToast(id)}
                  className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-700">{formatPreview(event.body)}</p>
              <p className="mt-2 text-xs text-slate-400">{new Date(event.createdAt).toLocaleString("ja-JP")}</p>
            </article>
          );
        }

        if (event.type === "badge_awarded") {
          return (
            <article
              key={id}
              className="pointer-events-auto rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-amber-800">バッジを獲得しました</p>
                  <p className="mt-1 text-xs text-amber-700">
                    {event.badge.name}{" "}
                    {event.reason ? `- ${event.reason}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="閉じる"
                  onClick={() => removeToast(id)}
                  className="rounded-md p-1 text-amber-600 transition hover:bg-amber-100"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
              {event.badge.description && (
                <p className="mt-3 text-sm text-amber-800">{event.badge.description}</p>
              )}
              <p className="mt-2 text-xs text-amber-700">{new Date(event.awardedAt).toLocaleString("ja-JP")}</p>
            </article>
          );
        }

        return null;
      })}
    </div>
  );
}
