"use client";

import { cn } from "@/lib/utils";

/**
 * Premium skeleton component for People list loading state
 * Matches the final row layout: avatar + name/role + team/department metadata + availability pill
 */
export function PeopleListSkeleton() {
  return (
    <div className="space-y-0 divide-y divide-white/5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center justify-between",
            "py-4 px-6",
            "transition-colors",
            "animate-pulse"
          )}
        >
          {/* Left: Avatar + Name + Role */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Avatar skeleton */}
            <div className="h-10 w-10 rounded-full bg-muted/50 shrink-0" />
            
            {/* Name + Role skeleton */}
            <div className="flex min-w-0 flex-col gap-1.5 flex-1">
              <div className="h-4 w-32 bg-muted/50 rounded" />
              <div className="h-3 w-24 bg-muted/30 rounded" />
            </div>
          </div>

          {/* Middle: Metadata (team/department) */}
          <div className="hidden md:flex items-center gap-2 px-4">
            <div className="h-3 w-20 bg-muted/30 rounded" />
            <div className="h-3 w-24 bg-muted/30 rounded" />
          </div>

          {/* Right: Availability pill skeleton */}
          <div className="shrink-0">
            <div className="h-6 w-20 rounded-full bg-muted/30" />
          </div>
        </div>
      ))}
    </div>
  );
}
