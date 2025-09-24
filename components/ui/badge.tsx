import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = {
  children: ReactNode;
  className?: string;
  tone?: "default" | "success" | "warning";
};

const toneStyles: Record<NonNullable<BadgeProps["tone"]>, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700"
};

export function Badge({ children, className, tone = "default" }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", toneStyles[tone], className)}>
      {children}
    </span>
  );
}
