"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PeopleFilters } from "./people-filters";
import { useOrgStructureLists } from "@/hooks/useOrgStructureLists";
import { cn } from "@/lib/utils";

type PeopleFilterControlsProps = {
  filters: PeopleFilters;
};

export function PeopleFilterControls({ filters }: PeopleFilterControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { teams, departments, roles, isLoading } = useOrgStructureLists();

  function updateFilter(key: keyof PeopleFilters, value?: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.push(`/org/directory${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px]">
      {/* Team filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-slate-400">Team</span>
        <select
          value={filters.teamId ?? ""}
          onChange={(e) => updateFilter("teamId", e.target.value || undefined)}
          disabled={isLoading}
          className={cn(
            "h-7 rounded-full border border-slate-700/70 bg-[#020617] px-3 text-[11px] text-slate-100",
            "outline-none transition-colors duration-150",
            "hover:border-slate-500 focus-visible:ring-2 focus-visible:ring-[#5CA9FF] focus-visible:ring-offset-0",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <option value="">All</option>
          {teams?.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {/* Department filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-slate-400">Department</span>
        <select
          value={filters.departmentId ?? ""}
          onChange={(e) =>
            updateFilter("departmentId", e.target.value || undefined)
          }
          disabled={isLoading}
          className={cn(
            "h-7 rounded-full border border-slate-700/70 bg-[#020617] px-3 text-[11px] text-slate-100",
            "outline-none transition-colors duration-150",
            "hover:border-slate-500 focus-visible:ring-2 focus-visible:ring-[#5CA9FF] focus-visible:ring-offset-0",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <option value="">All</option>
          {departments?.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>

      {/* Role filter */}
      {/* Note: Currently uses role name (not ID) because API searches by role title */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-slate-400">Role</span>
        <select
          value={filters.roleId ?? ""}
          onChange={(e) => updateFilter("roleId", e.target.value || undefined)}
          disabled={isLoading}
          className={cn(
            "h-7 rounded-full border border-slate-700/70 bg-[#020617] px-3 text-[11px] text-slate-100",
            "outline-none transition-colors duration-150",
            "hover:border-slate-500 focus-visible:ring-2 focus-visible:ring-[#5CA9FF] focus-visible:ring-offset-0",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <option value="">All</option>
          {roles?.map((role) => (
            <option key={role.id} value={role.name}>
              {role.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

