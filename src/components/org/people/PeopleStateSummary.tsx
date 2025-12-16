"use client";

import { cn } from "@/lib/utils";
import type { PeopleFilters } from "./people-filters";
import { hasAnyPeopleFilter } from "./people-filters";

type PeopleStateSummaryProps = {
  visibleCount: number;
  totalCount: number;
  filters: PeopleFilters;
  activeView?: string;
  activeShortlistName?: string;
  searchQuery?: string;
};

/**
 * Subtle summary line showing current filter/view state
 * Only visible when filters, views, or search are active
 */
export function PeopleStateSummary({
  visibleCount,
  totalCount,
  filters,
  activeView,
  activeShortlistName,
  searchQuery,
}: PeopleStateSummaryProps) {
  const hasFilters = hasAnyPeopleFilter(filters) || !!searchQuery || !!activeShortlistName;
  const isDefaultState = !hasFilters && !activeView && visibleCount === totalCount;

  // Don't show if in default state
  if (isDefaultState) return null;

  const parts: string[] = [];

  // Count
  if (visibleCount !== totalCount) {
    parts.push(`Showing ${visibleCount} of ${totalCount} people`);
  } else {
    parts.push(`${totalCount} ${totalCount === 1 ? "person" : "people"}`);
  }

  // Filters
  if (hasFilters) {
    parts.push("Filters applied");
  }

  // View
  if (activeView && activeView !== "All people") {
    parts.push(`View: ${activeView}`);
  }

  // Shortlist
  if (activeShortlistName) {
    parts.push(`Shortlist: ${activeShortlistName}`);
  }

  return (
    <div className="mt-4 mb-2">
      <p className="text-[12px] text-slate-500">
        {parts.join(" · ")}
      </p>
    </div>
  );
}

