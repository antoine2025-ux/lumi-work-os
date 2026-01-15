"use client";

import { cn } from "@/lib/utils";

type UnassignedBadgeProps = {
  field?: string;
  className?: string;
};

export function UnassignedBadge({ field, className }: UnassignedBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-slate-700 bg-slate-900/50 px-2 py-0.5 text-[11px] font-medium text-slate-500 italic",
        className
      )}
      title={field ? `${field} hasn't been set yet.` : "This field hasn't been set yet."}
    >
      Not set
    </span>
  );
}

