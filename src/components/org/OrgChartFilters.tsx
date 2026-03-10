"use client";

import { cn } from "@/lib/utils";

export type OrgChartFilter = "all" | "hiring" | "large" | "recent";

export interface OrgChartFiltersProps {
  activeFilter: OrgChartFilter;
  onChange: (filter: OrgChartFilter) => void;
}

/**
 * Premium filter pills for Org chart
 * Cohesive query bar component with toggle behavior
 */
export function OrgChartFilters({ activeFilter, onChange }: OrgChartFiltersProps) {
  const handleClick = (filter: OrgChartFilter) => {
    if (filter === activeFilter && filter !== "all") {
      onChange("all");
    } else {
      onChange(filter);
    }
  };

  const base = cn(
    "inline-flex items-center gap-2",
    "rounded-full",
    "px-4 py-1.5",
    "text-sm",
    "transition-all duration-200",
    "select-none",
    "cursor-pointer"
  );

  const inactive = cn(
    base,
    "bg-muted/50",
    "text-muted-foreground",
    "hover:bg-muted/70",
    "hover:text-foreground",
    "hover:-translate-y-[1px]"
  );

  const active = cn(
    base,
    "bg-primary/20",
    "text-primary",
    "font-medium",
    "ring-1 ring-primary/60"
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={activeFilter === "all" ? active : inactive}
        onClick={() => handleClick("all")}
      >
        All
      </button>

      <button
        type="button"
        className={activeFilter === "hiring" ? active : inactive}
        onClick={() => handleClick("hiring")}
      >
        <span className="text-xs leading-none">●</span>
        <span>Hiring</span>
      </button>

      <button
        type="button"
        className={activeFilter === "large" ? active : inactive}
        onClick={() => handleClick("large")}
      >
        &gt; 10 people
      </button>

      <button
        type="button"
        className={activeFilter === "recent" ? active : inactive}
        onClick={() => handleClick("recent")}
      >
        Recently changed
      </button>
    </div>
  );
}

