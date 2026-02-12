"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrgPrimaryCta } from "@/components/org/ui/OrgCtaButton";
import { useOrgUrl } from "@/hooks/useOrgUrl";

type PeopleEmptyStateProps = {
  hasFilters: boolean;
  onClearFilters?: () => void;
  onResetSearch?: () => void;
  onAddPerson?: () => void;
};

/**
 * Premium empty state for People page
 * Matches department row styling for seamless integration
 * 
 * When hasFilters is false: Shows "Add your first person" empty state
 * When hasFilters is true: Shows "No people match this view" filtered state
 */
export function PeopleEmptyState({
  hasFilters,
  onClearFilters,
  onResetSearch,
  onAddPerson,
}: PeopleEmptyStateProps) {
  const orgUrl = useOrgUrl();

  // Empty state when no people exist (no filters)
  if (!hasFilters) {
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
            Add your first person
          </p>
          <p className="text-sm text-white/60">
            Org becomes your source of truth once you add people.
          </p>
        </div>

        {/* Right: primary CTA */}
        <div className="ml-auto shrink-0">
          {onAddPerson ? (
            <OrgPrimaryCta onClick={onAddPerson} size="sm">
              Add person
            </OrgPrimaryCta>
          ) : (
            <OrgPrimaryCta asChild size="sm">
              <Link href={orgUrl.newPerson}>Add person</Link>
            </OrgPrimaryCta>
          )}
        </div>
      </div>
    );
  }

  // Empty state when filters are active but no results
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
          {onResetSearch && (
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
          )}
          {onClearFilters && (
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
          )}
        </div>
      </div>
    </div>
  );
}

