const BADGE_ICONS: Record<string, string> = {
  first_question: "🎯",
  first_upload: "📂",
  credit_saver: "💰",
  mentor_helper: "🤝"
};

type BadgeView = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  reason: string | null;
  awardedAt: string;
};

type BadgeGridProps = {
  badges: BadgeView[];
};

function resolveIcon(code: string, icon: string | null) {
  return icon && icon.length > 0 ? icon : BADGE_ICONS[code] ?? "⭐";
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  if (badges.length === 0) {
    return <p className="text-sm text-slate-500">まだバッジは獲得していません。資料共有や回答参加でバッジを集めましょう。</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {badges.map((badge) => (
        <div key={badge.id} className="flex gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-2xl">
            <span aria-hidden>{resolveIcon(badge.code, badge.icon)}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="font-semibold text-slate-800">{badge.name}</div>
            {badge.description && <p className="text-slate-500">{badge.description}</p>}
            <p className="text-xs text-slate-400">
              {badge.reason ?? "アクティビティ達成"} / {new Date(badge.awardedAt).toLocaleDateString("ja-JP")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
