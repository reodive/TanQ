"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md";
};

const styles: Record<Exclude<ButtonProps["variant"], undefined>, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary: "border border-brand-600 text-brand-600 hover:bg-brand-50",
  ghost: "text-brand-600 hover:bg-brand-50",
  outline: "border border-slate-300 text-slate-700 hover:bg-slate-100"
};

const sizeStyles: Record<Exclude<ButtonProps["size"], undefined>, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "rounded-md font-medium transition",
        sizeStyles[size],
        styles[variant],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
