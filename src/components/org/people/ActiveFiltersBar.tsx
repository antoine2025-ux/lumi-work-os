"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PeopleFilters } from "./people-filters";

type ActiveFiltersBarProps = {
  filters: PeopleFilters;
  search: string;
  onRemoveFilter: (key: keyof PeopleFilters) => void;
  onClearSearch: () => void;
  onClearAll: () => void;
  teamName?: string;
  departmentName?: string;
  roleName?: string;
};

/**
 * Premium active filters bar for People page
 * Shows chips for each active filter/search with remove actions
 */
export function ActiveFiltersBar({
  filters,
  search,
  onRemoveFilter,
  onClearSearch,
  onClearAll,
  teamName,
  departmentName,
  roleName,
}: ActiveFiltersBarProps) {
  const hasActiveFilters = Boolean(
    filters.teamId || filters.departmentId || filters.roleId || search.trim()
  );

  if (!hasActiveFilters) return null;

  const chips: Array<{ key: string; label: string; value: string; onRemove: () => void }> = [];

  if (search.trim()) {
    chips.push({
      key: "search",
      label: "Search",
      value: `'${search}'`,
      onRemove: onClearSearch,
    });
  }

  if (filters.teamId) {
    chips.push({
      key: "teamId",
      label: "Team",
      value: teamName || filters.teamId,
      onRemove: () => onRemoveFilter("teamId"),
    });
  }

  if (filters.departmentId) {
    chips.push({
      key: "departmentId",
      label: "Department",
      value: departmentName || filters.departmentId,
      onRemove: () => onRemoveFilter("departmentId"),
    });
  }

  if (filters.roleId) {
    chips.push({
      key: "roleId",
      label: "Role",
      value: roleName || filters.roleId,
      onRemove: () => onRemoveFilter("roleId"),
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-card/40 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.onRemove}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/60",
              "px-3 py-1 text-xs text-foreground/80",
              "hover:border-slate-600/60 hover:bg-muted/80",
              "transition-colors"
            )}
          >
            <span className="font-medium">{chip.label}:</span>
            <span className="max-w-[12rem] truncate">{chip.value}</span>
            <X className="h-3 w-3 text-foreground/50" />
          </button>
        ))}
      </div>

      {chips.length > 1 && (
        <>
          <div className="h-4 w-px bg-slate-700/60" />
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-foreground/60 hover:text-foreground/80 transition-colors"
          >
            Clear all
          </button>
        </>
      )}
    </div>
  );
}

