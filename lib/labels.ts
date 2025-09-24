const ROLE_LABELS = {
  student: "生徒",
  responder: "メンター",
  schoolAdmin: "学校管理者",
  sysAdmin: "システム管理者"
} as const;

const RANK_LABELS = {
  rookie: "ビギナー",
  explorer: "エクスプローラー",
  mentor: "メンター",
  master: "マスター",
  legend: "レジェンド"
} as const;

const QUESTION_STATUS_LABELS = {
  draft: "下書き",
  queued: "対応待ち",
  assigned: "担当者割り当て済み",
  answered: "回答済み",
  closed: "クローズ"
} as const;

const CREDIT_TXN_TYPE_LABELS = {
  debit: "消費",
  credit: "付与",
  refund: "返金",
  bonus: "ボーナス",
  purchase: "購入付与",
  adjustment: "調整"
} as const;

const PURCHASE_STATUS_LABELS = {
  pending: "保留",
  completed: "完了",
  failed: "失敗",
  cancelled: "キャンセル"
} as const;

const PURCHASE_ITEM_LABELS = {
  plan: "プラン",
  credits: "クレジット"
} as const;

const SCHOOL_PLAN_LABELS = {
  free: "フリー",
  starter: "スターター",
  growth: "グロース",
  enterprise: "エンタープライズ"
} as const;

const BILLING_STATUS_LABELS = {
  trial: "お試し中",
  active: "有効",
  delinquent: "支払い遅延",
  suspended: "停止中",
  cancelled: "解約済み"
} as const;

type LabelDictionary = Record<string, string>;

function resolveLabel(dict: LabelDictionary, value: string | null | undefined, fallback = "") {
  if (value == null || value === "") {
    return fallback;
  }
  return dict[value] ?? value;
}

export {
  ROLE_LABELS,
  RANK_LABELS,
  QUESTION_STATUS_LABELS,
  CREDIT_TXN_TYPE_LABELS,
  PURCHASE_STATUS_LABELS,
  PURCHASE_ITEM_LABELS,
  SCHOOL_PLAN_LABELS,
  BILLING_STATUS_LABELS,
  resolveLabel
};

