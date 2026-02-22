"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { chipInactiveClass, focusRingClass } from "./people-styles";
import type { PeopleFilters } from "./people-filters";

type ActiveFiltersChipsProps = {
  filters: PeopleFilters;
  onRemoveFilter: (key: keyof PeopleFilters) => void;
  teamName?: string;
  departmentName?: string;
  roleName?: string;
};

/**
 * Active filters chips component
 * Shows removable chips for each active filter
 * Used inline under FiltersBar and in FiltersDrawer
 */
export function ActiveFiltersChips({
  filters,
  onRemoveFilter,
  teamName,
  departmentName,
  roleName,
}: ActiveFiltersChipsProps) {
  const chips: Array<{ key: keyof PeopleFilters; label: string; value: string }> = [];

  if (filters.teamId) {
    chips.push({
      key: "teamId",
      label: "Team",
      value: teamName || filters.teamId,
    });
  }

  if (filters.departmentId) {
    chips.push({
      key: "departmentId",
      label: "Department",
      value: departmentName || filters.departmentId,
    });
  }

  if (filters.roleId) {
    chips.push({
      key: "roleId",
      label: "Role",
      value: roleName || filters.roleId,
    });
  }

  if (filters.managerId) {
    chips.push({
      key: "managerId",
      label: "Manager",
      value: filters.managerId,
    });
  }

  if (filters.leadersOnly) {
    chips.push({
      key: "leadersOnly",
      label: "Leaders",
      value: "Only",
    });
  }

  if (filters.unassignedOnly) {
    chips.push({
      key: "unassignedOnly",
      label: "Unassigned",
      value: "Only",
    });
  }

  if (filters.recentlyChanged) {
    chips.push({
      key: "recentlyChanged",
      label: "Recently",
      value: "Changed",
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onRemoveFilter(chip.key)}
          className={cn(
            chipInactiveClass,
            "gap-1.5",
            "px-2.5 py-1",
            "cursor-pointer",
            focusRingClass
          )}
        >
          <span className="font-medium text-[11px]">{chip.label}:</span>
          <span className="max-w-[12rem] truncate text-[11px]">{chip.value}</span>
          <X className="h-3 w-3 text-slate-400 shrink-0" />
        </button>
      ))}
    </div>
  );
}

