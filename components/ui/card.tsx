import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Card({ title, action, children, className }: CardProps) {
  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white p-6 shadow-sm", className)}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between">
          {title && <h2 className="text-lg font-semibold text-slate-800">{title}</h2>}
          {action}
        </header>
      )}
      <div className="space-y-4 text-sm text-slate-700">{children}</div>
    </section>
  );
}
