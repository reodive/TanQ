"use client";

import { useMemo } from "react";

export type BalancePoint = {
  date: string;
  balance: number;
};

type BalanceChartProps = {
  points: BalancePoint[];
};

export function BalanceChart({ points }: BalanceChartProps) {
  const chart = useMemo(() => {
    if (!points.length) {
      return null;
    }
    const sorted = [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const balances = sorted.map((p) => p.balance);
    const min = Math.min(...balances);
    const max = Math.max(...balances);
    const range = max - min || 1;
    const normalized = sorted.map((point, index) => {
      const x = sorted.length === 1 ? 0 : (index / (sorted.length - 1)) * 100;
      const y = 100 - ((point.balance - min) / range) * 100;
      return { ...point, x, y };
    });
    const path = normalized
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
      .join(" ");
    const area = `${normalized
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
      .join(" ")} L100,100 L0,100 Z`;
    return { normalized, min, max, path, area };
  }, [points]);

  if (!chart) {
    return <p className="text-sm text-slate-500">表示できる履歴がまだありません。</p>;
  }

  const { normalized, min, max, path, area } = chart;

  return (
    <div className="space-y-3">
      <div className="relative h-40 w-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="balance-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(59,130,246,0.35)" />
              <stop offset="100%" stopColor="rgba(59,130,246,0)" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#balance-gradient)" />
          <path d={path} fill="none" stroke="rgb(37, 99, 235)" strokeWidth="2" strokeLinecap="round" />
          {normalized.map((point) => (
            <circle key={point.date} cx={point.x} cy={point.y} r={1.5} fill="rgb(37, 99, 235)" />
          ))}
        </svg>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>最小 {min} pt</span>
        <span>最大 {max} pt</span>
      </div>
      <ul className="space-y-1 text-xs text-slate-500">
        {normalized.slice(-3).reverse().map((point) => (
          <li key={point.date}>
            {new Date(point.date).toLocaleString("ja-JP")}: {point.balance} pt
          </li>
        ))}
      </ul>
    </div>
  );
}
