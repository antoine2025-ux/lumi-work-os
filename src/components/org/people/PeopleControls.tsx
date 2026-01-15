"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PeopleFilters } from "./people-filters";

type PeopleControlsProps = {
  search: string;
  onSearchChange: (value: string) => void;
  team: string;
  onTeamChange: (value: string) => void;
  department: string;
  onDepartmentChange: (value: string) => void;
  role: string;
  onRoleChange: (value: string) => void;
  sort: string;
  onSortChange: (combinedValue: string) => void; // Format: "sort-direction"
  sortDirection: "asc" | "desc";
  onSortDirectionToggle: () => void; // Kept for backward compatibility
  availableTeams: Array<{ id: string; name: string }>;
  availableDepartments: Array<{ id: string; name: string }>;
  availableRoles: Array<{ id: string; name: string }>;
  isLoading?: boolean;
};

/**
 * Premium consolidated controls bar for People page
 * Search + Filters + Sort in one cohesive row
 */
export function PeopleControls({
  search,
  onSearchChange,
  team,
  onTeamChange,
  department,
  onDepartmentChange,
  role,
  onRoleChange,
  sort,
  onSortChange,
  sortDirection,
  onSortDirectionToggle,
  availableTeams,
  availableDepartments,
  availableRoles,
  isLoading = false,
}: PeopleControlsProps) {
  const handleClearSearch = () => {
    onSearchChange("");
  };

  // Detect OS for keyboard shortcut hint
  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const shortcutHint = isMac ? "⌘K" : "Ctrl K";

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      {/* Left: Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search people by name, email, role…"
            className={cn(
              "w-full rounded-full border border-slate-800/70 bg-slate-900/60",
              "px-4 py-2 pl-9 pr-20",
              "text-sm text-white/90 placeholder:text-white/40",
              "focus:border-primary/70 focus:outline-none focus:ring-1 focus:ring-primary/60",
              "transition-colors"
            )}
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          
          {/* Clear button */}
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-12 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 hover:text-white/60 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Keyboard shortcut hint */}
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30">
            {shortcutHint}
          </span>
        </div>
      </div>

      {/* Right: Filters + Sort */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Team filter */}
        <div className="flex items-center gap-2">
          <select
            value={team || ""}
            onChange={(e) => onTeamChange(e.target.value || "")}
            disabled={isLoading}
            className={cn(
              "h-9 rounded-full border border-slate-800/70 bg-slate-900/60",
              "px-3 pr-8 text-sm text-white/90",
              "focus:border-primary/70 focus:outline-none focus:ring-1 focus:ring-primary/60",
              "transition-colors",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <option value="">All teams</option>
            {availableTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Department filter */}
        <div className="flex items-center gap-2">
          <select
            value={department || ""}
            onChange={(e) => onDepartmentChange(e.target.value || "")}
            disabled={isLoading}
            className={cn(
              "h-9 rounded-full border border-slate-800/70 bg-slate-900/60",
              "px-3 pr-8 text-sm text-white/90",
              "focus:border-primary/70 focus:outline-none focus:ring-1 focus:ring-primary/60",
              "transition-colors",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <option value="">All departments</option>
            {availableDepartments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Role filter */}
        <div className="flex items-center gap-2">
          <select
            value={role || ""}
            onChange={(e) => onRoleChange(e.target.value || "")}
            disabled={isLoading}
            className={cn(
              "h-9 rounded-full border border-slate-800/70 bg-slate-900/60",
              "px-3 pr-8 text-sm text-white/90",
              "focus:border-primary/70 focus:outline-none focus:ring-1 focus:ring-primary/60",
              "transition-colors",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <option value="">All roles</option>
            {availableRoles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort - Compact single control */}
        <div className="flex items-center gap-2">
          <select
            value={`${sort || "name"}-${sortDirection || "asc"}`}
            onChange={(e) => {
              onSortChange(e.target.value);
            }}
            className={cn(
              "h-9 rounded-full border border-slate-800/70 bg-slate-900/60",
              "px-3 pr-8 text-sm text-white/90",
              "focus:border-primary/70 focus:outline-none focus:ring-1 focus:ring-primary/60",
              "transition-colors"
            )}
          >
            <option value="name-asc">Sort: Name (A→Z)</option>
            <option value="name-desc">Sort: Name (Z→A)</option>
            <option value="joinedAt-desc">Sort: Join date (Newest)</option>
            <option value="joinedAt-asc">Sort: Join date (Oldest)</option>
            <option value="role-asc">Sort: Role (A→Z)</option>
            <option value="role-desc">Sort: Role (Z→A)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

