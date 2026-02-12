"use client";

import Link from "next/link";
import { Search, X, SlidersHorizontal, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PeopleViewToggle, type ViewMode } from "./PeopleViewToggle";
import { SavedViewsDropdown } from "./SavedViewsDropdown";
import { ShortlistsDropdown } from "./ShortlistsDropdown";
import { chipBaseClass, chipInactiveClass, chipActiveClass, focusRingClass } from "./people-styles";
import { useOrgUrl } from "@/hooks/useOrgUrl";
import type { QuickChip } from "./people-filters";
import type { PeopleFilters } from "./people-filters";
import type { Shortlist } from "@/hooks/useShortlists";

type PeopleFiltersBarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeQuickChip?: QuickChip;
  onQuickChipChange: (chip: QuickChip) => void;
  onOpenFiltersDrawer: () => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  isLoading?: boolean;
  // For views and shortlists
  currentFilters?: PeopleFilters;
  onViewSelect?: (filters: PeopleFilters) => void;
  shortlists?: Shortlist[];
  activeShortlistId?: string;
  onSelectShortlist?: (shortlistId: string) => void;
  onDeleteShortlist?: (shortlistId: string) => void;
  onClearShortlist?: () => void;
  canManagePeople?: boolean;
};

/**
 * Premium filters bar for People page
 * Search + Quick chips + More filters button
 * Matches Org Chart styling
 */
export function PeopleFiltersBar({
  searchQuery,
  onSearchChange,
  activeQuickChip = "all",
  onQuickChipChange,
  onOpenFiltersDrawer,
  viewMode,
  onViewModeChange,
  isLoading = false,
  currentFilters,
  onViewSelect,
  shortlists = [],
  activeShortlistId,
  onSelectShortlist,
  onDeleteShortlist,
  onClearShortlist,
  canManagePeople = true,
}: PeopleFiltersBarProps) {
  const orgUrl = useOrgUrl();
  
  const handleClearSearch = () => {
    onSearchChange("");
  };

  const quickChips: Array<{ value: QuickChip; label: string }> = [
    { value: "all", label: "All" },
    { value: "leaders", label: "Leaders" },
    { value: "unassigned", label: "Unassigned" },
    // Note: "new" and "recentlyChanged" can be added when data is available
  ];

  // Use shared chip styles with slight size adjustment for filter bar
  const filterChipBase = cn(
    chipBaseClass,
    "px-3.5 py-1.5",
    "text-[12px]",
    "cursor-pointer",
    "whitespace-nowrap"
  );

  const filterChipInactive = cn(
    filterChipBase,
    "bg-slate-900/40",
    "text-foreground/60",
    "border-slate-800/70",
    "hover:bg-slate-900/60",
    "hover:text-foreground/80",
    "hover:border-slate-700/70"
  );

  const filterChipActive = cn(
    filterChipBase,
    "bg-primary/25",
    "text-primary",
    "border-primary/50",
    "ring-1 ring-primary/40",
    "font-medium"
  );

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Left: View selector + Search */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Saved views dropdown */}
          {currentFilters && onViewSelect && (
            <SavedViewsDropdown
              currentFilters={currentFilters}
              onViewSelect={onViewSelect}
            />
          )}

          {/* Shortlists dropdown */}
          {shortlists.length > 0 && onSelectShortlist && (
            <ShortlistsDropdown
              shortlists={shortlists}
              activeShortlistId={activeShortlistId}
              onSelectShortlist={onSelectShortlist}
              onDeleteShortlist={onDeleteShortlist || (() => {})}
              onClearShortlist={onClearShortlist || (() => {})}
            />
          )}

          {/* Search */}
          <div className="relative flex-1 max-w-xl min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search people, roles, teams, departments…"
              disabled={isLoading}
              className={cn(
                "w-full rounded-full border border-slate-800/70 bg-slate-900/60",
                "px-4 py-2 pl-9 pr-10",
                "text-[13px] text-white/90 placeholder:text-white/40",
                "focus:border-primary/70 focus:outline-none focus:ring-1 focus:ring-primary/60",
                "transition-colors duration-150",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            
            {/* Clear button */}
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 hover:text-white/60 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Filter pills + Filters button + View toggle */}
        <div className="flex items-center gap-2">
          {/* Quick chips - grouped spacing */}
          <div className="flex items-center gap-2">
            {quickChips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                className={cn(
                  activeQuickChip === chip.value ? filterChipActive : filterChipInactive,
                  activeQuickChip === chip.value && "ring-1 ring-primary/40"
                )}
                onClick={() => onQuickChipChange(chip.value)}
                disabled={isLoading}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* More filters button */}
          <button
            type="button"
            onClick={onOpenFiltersDrawer}
            disabled={isLoading}
            className={cn(
              filterChipInactive,
              "gap-2",
              focusRingClass,
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
          </button>

          {/* View toggle */}
          {viewMode !== undefined && onViewModeChange && (
            <PeopleViewToggle
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
            />
          )}

          {/* Add person button */}
          {canManagePeople && (
            <Link
              href={orgUrl.newPerson}
              className={cn(
                "inline-flex items-center justify-center gap-2",
                "rounded-full",
                "px-4 py-2",
                "text-sm font-medium",
                "bg-primary",
                "hover:bg-primary/90",
                "text-white",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <UserPlus className="h-4 w-4" />
              <span>Add person</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

