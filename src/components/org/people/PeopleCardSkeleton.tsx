"use client";

import { cn } from "@/lib/utils";

type PeopleCardSkeletonProps = {
  className?: string;
};

/**
 * Skeleton loading state for person card
 */
export function PeopleCardSkeleton({ className }: PeopleCardSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-3xl",
        "bg-slate-900/80",
        "border border-white/5",
        "shadow-[0_24px_80px_rgba(0,0,0,0.25)]",
        "p-5",
        "animate-pulse",
        className
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="h-12 w-12 rounded-full bg-slate-800/50 shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="h-[14px] w-32 bg-slate-800/50 rounded" />
          <div className="h-3 w-24 bg-slate-800/50 rounded" />
          <div className="flex gap-1.5">
            <div className="h-5 w-16 bg-slate-800/50 rounded-full" />
            <div className="h-5 w-20 bg-slate-800/50 rounded-full" />
          </div>
        </div>
      </div>
      <div className="pt-3 border-t border-white/5">
        <div className="h-3 w-40 bg-slate-800/50 rounded mb-3" />
      </div>
      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
        <div className="h-3 w-12 bg-slate-800/50 rounded" />
        <div className="h-3 w-16 bg-slate-800/50 rounded" />
      </div>
    </div>
  );
}

