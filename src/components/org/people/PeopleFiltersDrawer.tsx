"use client";

import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ActiveFiltersChips } from "./ActiveFiltersChips";
import type { PeopleFilters } from "./people-filters";
import type { StructureTeam, StructureDepartment, StructureRole } from "@/types/org";

type PeopleFiltersDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  filters: PeopleFilters;
  onFiltersChange: (filters: Partial<PeopleFilters>) => void;
  onClearAll: () => void;
  availableTeams: StructureTeam[];
  availableDepartments: StructureDepartment[];
  availableRoles: StructureRole[];
  teamName?: string;
  departmentName?: string;
  roleName?: string;
};

/**
 * Advanced filters drawer for People page
 * Right-side drawer with Team, Department, Role, Manager selects
 * Status flags checkboxes and active filters summary
 */
export function PeopleFiltersDrawer({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onClearAll,
  availableTeams,
  availableDepartments,
  availableRoles,
  teamName,
  departmentName,
  roleName,
}: PeopleFiltersDrawerProps) {
  const handleFilterChange = (key: keyof PeopleFilters, value: any) => {
    onFiltersChange({ [key]: value });
  };

  const handleClearAll = () => {
    onClearAll();
    onClose();
  };

  const hasActiveFilters = Boolean(
    filters.teamId ||
    filters.departmentId ||
    filters.roleId ||
    filters.managerId ||
    filters.leadersOnly ||
    filters.unassignedOnly ||
    filters.recentlyChanged
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md bg-slate-900 border-white/10 text-slate-100"
        onInteractOutside={(_e) => {
          // Allow closing on outside click
        }}
      >
        <DialogHeader className="space-y-4 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-slate-100">
              Filters
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Active filters summary */}
          {hasActiveFilters && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Filters
              </h3>
              <ActiveFiltersChips
                filters={filters}
                onRemoveFilter={(key) => handleFilterChange(key, undefined)}
                teamName={teamName}
                departmentName={departmentName}
                roleName={roleName}
              />
            </div>
          )}

          {/* Team filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Team</label>
            <select
              value={filters.teamId || ""}
              onChange={(e) => handleFilterChange("teamId", e.target.value || undefined)}
              className={cn(
                "w-full rounded-lg border border-slate-800/70 bg-slate-900/60",
                "px-3 py-2 text-sm text-white/90",
                "focus:border-primary/70 focus:outline-none focus:ring-1 focus:ring-primary/60",
                "transition-colors"
              )}
            >
              <option value="">All teams</option>
              {availableTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Department</label>
            <select
              value={filters.departmentId || ""}
              onChange={(e) => handleFilterChange("departmentId", e.target.value || undefined)}
              className={cn(
                "w-full rounded-lg border border-slate-800/70 bg-slate-900/60",
                "px-3 py-2 text-sm text-white/90",
                "focus:border-primary/70 focus:outline-none focus:ring-1 focus:ring-primary/60",
                "transition-colors"
              )}
            >
              <option value="">All departments</option>
              {availableDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Role</label>
            <select
              value={filters.roleId || ""}
              onChange={(e) => handleFilterChange("roleId", e.target.value || undefined)}
              className={cn(
                "w-full rounded-lg border border-slate-800/70 bg-slate-900/60",
                "px-3 py-2 text-sm text-white/90",
                "focus:border-primary/70 focus:outline-none focus:ring-1 focus:ring-primary/60",
                "transition-colors"
              )}
            >
              <option value="">All roles</option>
              {availableRoles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Sort by</label>
            <select
              value={`${filters.sort || "name"}-${filters.direction || "asc"}`}
              onChange={(e) => {
                const [sort, direction] = e.target.value.split("-");
                onFiltersChange({ sort: sort as PeopleFilters["sort"], direction: direction as PeopleFilters["direction"] });
              }}
              className={cn(
                "w-full rounded-lg border border-slate-800/70 bg-slate-900/60",
                "px-3 py-2 text-sm text-white/90",
                "focus:border-primary/70 focus:outline-none focus:ring-1 focus:ring-primary/60",
                "transition-colors"
              )}
            >
              <option value="name-asc">Name (A→Z)</option>
              <option value="name-desc">Name (Z→A)</option>
              <option value="joinedAt-desc">Join date (Newest)</option>
              <option value="joinedAt-asc">Join date (Oldest)</option>
              <option value="role-asc">Role (A→Z)</option>
              <option value="role-desc">Role (Z→A)</option>
            </select>
          </div>

          {/* Status flags */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-200">Status</h3>
            
            {/* Leaders checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.leadersOnly || false}
                onChange={(e) => handleFilterChange("leadersOnly", e.target.checked || undefined)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary/60"
              />
              <span className="text-sm text-slate-300">Leaders only</span>
            </label>

            {/* Unassigned checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.unassignedOnly || false}
                onChange={(e) => handleFilterChange("unassignedOnly", e.target.checked || undefined)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary/60"
              />
              <span className="text-sm text-slate-300">Unassigned only</span>
            </label>

            {/* Recently changed checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.recentlyChanged || false}
                onChange={(e) => handleFilterChange("recentlyChanged", e.target.checked || undefined)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary/60"
              />
              <span className="text-sm text-slate-300">Recently changed</span>
            </label>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={handleClearAll}
            disabled={!hasActiveFilters}
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            Clear all
          </Button>
          <Button
            onClick={onClose}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

