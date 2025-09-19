import { cn } from "@/lib/utils";

type SpinnerProps = {
  size?: "sm" | "md";
  className?: string;
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  const dimension = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return (
    <span
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-brand-400 border-t-transparent",
        dimension,
        className
      )}
    />
  );
}
