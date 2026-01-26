"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { PeopleFilters, hasAnyPeopleFilter } from "./people-filters";
import { cn } from "@/lib/utils";

type PeopleFilterBarProps = {
  filters: PeopleFilters;
  // Optional: provide display names for filter values
  teamName?: string;
  departmentName?: string;
  roleName?: string;
};

export function PeopleFilterBar({ 
  filters, 
  teamName,
  departmentName,
  roleName,
}: PeopleFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const anyFilters = hasAnyPeopleFilter(filters);
  if (!anyFilters) return null;

  const items: { key: keyof PeopleFilters; label: string; value?: string; displayValue?: string }[] = [
    { 
      key: "teamId", 
      label: "Team", 
      value: filters.teamId,
      displayValue: teamName || filters.teamId,
    },
    { 
      key: "departmentId", 
      label: "Department", 
      value: filters.departmentId,
      displayValue: departmentName || filters.departmentId,
    },
    { 
      key: "roleId", 
      label: "Role", 
      value: filters.roleId,
      displayValue: roleName || filters.roleId,
    },
  ].filter((item) => item.value);

  function handleClearAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("teamId");
    params.delete("departmentId");
    params.delete("roleId");
    // Keep search query if present
    router.push(`/org/people${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function handleRemoveFilter(key: keyof PeopleFilters) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    router.push(`/org/people${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="mb-3 mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
        Filters
      </span>

      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => handleRemoveFilter(item.key)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-slate-700/70 px-2.5 py-1",
              "bg-[#020617] text-[11px] text-slate-200",
              "hover:border-slate-500 hover:text-slate-50",
              "transition-colors duration-150"
            )}
          >
            <span className="font-medium">{item.label}</span>
            <span className="max-w-[12rem] truncate text-slate-400">
              {item.displayValue}
            </span>
            <X className="h-3 w-3 text-slate-500" />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleClearAll}
        className="ml-1 inline-flex items-center text-[11px] text-slate-400 hover:text-slate-100 transition-colors duration-150"
      >
        Clear filters
      </button>
    </div>
  );
}

