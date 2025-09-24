import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import Link from "next/link";
import NotificationCenter from "@/components/notifications/NotificationCenter";

export const metadata: Metadata = {
  title: "TanQ（タンキュー）",
  description: "探究学習を支える質問コミュニティ。生徒とメンターが学びを共有しながら成長できます。"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-lg font-semibold text-brand-600">
                TanQ
              </Link>
              <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
                <Link className="transition hover:text-brand-600" href="/dashboard">
                  ダッシュボード
                </Link>
                <Link className="transition hover:text-brand-600" href="/chat">
                  チャット
                </Link>
                <Link className="transition hover:text-brand-600" href="/forum">
                  フォーラム
                </Link>
                <Link className="transition hover:text-brand-600" href="/voice">
                  ボイス
                </Link>
                <Link className="transition hover:text-brand-600" href="/wallet">
                  ウォレット
                </Link>
              </nav>
            </div>
          </header>
          <div className="flex-1">{children}</div>
        </div>
        <NotificationCenter />
      </body>
    </html>
  );
}
