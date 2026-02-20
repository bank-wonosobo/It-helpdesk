import * as React from "react";
import { cn } from "@/lib/utils";

export function SurfaceCard({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("ds-surface", className)} {...props} />;
}

export function NoticeCard({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  tone?: "neutral" | "error" | "warning";
}) {
  const toneClass =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
      : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <div
      className={cn("rounded-xl border px-3 py-3 text-sm", toneClass, className)}
      {...props}
    />
  );
}

export function EmptyState({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("ds-empty", className)} {...props} />;
}

export function FieldGroup({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
