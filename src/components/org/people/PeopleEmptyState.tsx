"use client";

import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

type PeopleEmptyStateProps = {
  hasFilters: boolean;
  onClearFilters: () => void;
  onResetSearch: () => void;
};

/**
 * Premium empty state for People page
 * Matches department row styling for seamless integration
 */
export function PeopleEmptyState({
  hasFilters,
  onClearFilters,
  onResetSearch,
}: PeopleEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-center",
        "w-full",
        "rounded-3xl",
        "bg-slate-900/80",
        "border border-white/5",
        "shadow-[0_24px_80px_rgba(0,0,0,0.25)]",
        "px-8 py-6"
      )}
    >
      {/* Left: icon tile */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900/60 flex-shrink-0">
        <Users className="h-7 w-7 text-white/60" />
      </div>

      {/* Middle: text */}
      <div className="flex min-w-0 flex-col gap-1 flex-1">
        <p className="text-base font-medium text-white">
          No people match this view.
        </p>
        <p className="text-sm text-white/60">
          Try adjusting your search, changing filters, or clearing them to see everyone again.
        </p>
      </div>

      {/* Right: actions */}
      <div className="ml-auto shrink-0 flex flex-col items-end gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onResetSearch}
            className={cn(
              "text-sm text-white/60",
              "hover:text-white/80",
              "transition-colors",
              "underline-offset-2 hover:underline"
            )}
          >
            Reset search
          </button>
          <button
            type="button"
            onClick={onClearFilters}
            className={cn(
              "inline-flex items-center justify-center",
              "rounded-full",
              "px-5 py-2",
              "text-sm font-medium",
              "bg-slate-900/70",
              "hover:bg-slate-900/90",
              "text-primary",
              "transition-colors"
            )}
          >
            Clear filters
          </button>
        </div>
        {!hasFilters && (
          <Link
            href="/org/structure"
            className={cn(
              "inline-flex items-center gap-1.5",
              "text-xs text-slate-400 hover:text-slate-300",
              "transition-colors duration-150"
            )}
          >
            <span>Set up structure</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

