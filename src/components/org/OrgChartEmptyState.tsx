"use client";

import { SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { type OrgChartFilter } from "./OrgChartFilters";

export interface OrgChartEmptyStateProps {
  activeFilter: OrgChartFilter;
  searchQuery: string;
  onClearFilters: () => void;
}

/**
 * Filter-aware empty state copy helper
 */
function getEmptyStateCopy(filter: OrgChartFilter, searchQuery: string) {
  const hasSearch = searchQuery.trim().length > 0;

  if (filter === "hiring") {
    return {
      title: "No departments are currently marked as hiring.",
      body: hasSearch
        ? "Try updating your search or switching filters to see other departments."
        : "Try switching filters or clearing them to see all departments again.",
    };
  }

  if (filter === "large") {
    return {
      title: "No departments have more than 10 people yet.",
      body: "Try another filter, or clear filters to see all departments by size.",
    };
  }

  if (filter === "recent") {
    return {
      title: "No departments have changed recently.",
      body: "Try a different filter, or clear filters to see your full org again.",
    };
  }

  // default / "all"
  return {
    title: "No departments match your search and filters.",
    body: "Try changing the search, switching filters, or clearing them to see all departments again.",
  };
}

/**
 * Premium empty state component for Org chart
 * Matches department row styling for seamless integration
 */
export function OrgChartEmptyState({
  activeFilter,
  searchQuery,
  onClearFilters,
}: OrgChartEmptyStateProps) {
  const { title, body } = getEmptyStateCopy(activeFilter, searchQuery);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-center",
        "w-full",
        "rounded-3xl",
        "bg-card/80",
        "border border-white/5",
        "shadow-[0_24px_80px_rgba(0,0,0,0.35)]",
        "px-8 py-6"
      )}
    >
      {/* Left: icon tile */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card/60 flex-shrink-0">
        <SearchX className="h-7 w-7 text-foreground/60" />
      </div>

      {/* Middle: text */}
      <div className="flex min-w-0 flex-col gap-1 flex-1">
        <p className="truncate text-base font-medium text-foreground">{title}</p>
        <p className="text-sm text-foreground/60">{body}</p>
      </div>

      {/* Right: clear button */}
      <div className="ml-auto shrink-0">
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center",
            "rounded-full",
            "px-5 py-2",
            "text-sm font-medium",
            "bg-card/70",
            "hover:bg-card/90",
            "text-primary",
            "transition-all duration-200",
            "hover:-translate-y-[1px]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
          )}
          onClick={onClearFilters}
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}

