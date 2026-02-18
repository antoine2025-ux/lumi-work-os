"use client";

/**
 * Org Structure Page - Client Component
 * 
 * Button Role Naming Convention (R2.13):
 * - "Add X" → Creation (new entity)
 * - "Assign X" → Placement (moving entity to location)
 * - "Manage" → Configuration (editing existing entity)
 * 
 * Button Variant Convention:
 * - Primary actions (Add/Assign) → variant="default" (filled)
 * - Secondary actions (Manage) → variant="ghost" (muted)
 * Note: Color encodes priority, not semantics.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreateDepartmentDialog } from "@/components/org/structure/CreateDepartmentDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type TeamLite = { id: string; name: string };
type DepartmentLite = {
  id: string;
  name: string;
  teams?: TeamLite[] | null;
};

type FilterKey = "all" | "empty" | "unassigned";

function isEmpty(dep: DepartmentLite) {
  const teams = dep.teams ?? [];
  return teams.length === 0;
}

function countTeams(dep: DepartmentLite) {
  return (dep.teams ?? []).length;
}

export function StructureClient({
  departments,
  unassignedTeams: initialUnassignedTeams,
}: {
  departments: DepartmentLite[];
  unassignedTeams: TeamLite[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Read filter from URL params if present
  const filterParam = searchParams?.get("filter") as FilterKey | null;
  const initialFilter: FilterKey = (filterParam && ["all", "empty", "unassigned"].includes(filterParam)) 
    ? filterParam 
    : "all";
  
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<FilterKey>(initialFilter);
  const [unassignedTeams, setUnassignedTeams] = React.useState(initialUnassignedTeams);
  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState<TeamLite | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState<string>("");
  const [isAssigning, setIsAssigning] = React.useState(false);
  const [assignmentError, setAssignmentError] = React.useState<{
    message: string;
    details?: {
      allTeamsWithSameName?: Array<{
        id: string;
        name: string;
        departmentId: string | null;
        departmentName: string | null;
        isUnassigned: boolean;
        isCurrentTeam: boolean;
        isExistingTeam: boolean;
      }>;
      duplicateCount?: number;
      existingTeamId?: string;
      existingTeamName?: string;
      existingTeamDepartmentName?: string;
    };
  } | null>(null);
  
  // Sync filter state with URL params when they change
  React.useEffect(() => {
    const filterParam = searchParams?.get("filter") as FilterKey | null;
    
    if (filterParam && ["all", "empty", "unassigned"].includes(filterParam) && filterParam !== filter) {
      setFilter(filterParam);
      
      // Scroll to unassigned teams section if filter is "unassigned"
      if (filterParam === "unassigned") {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          const unassignedSection = document.getElementById("unassigned-teams-section");
          if (unassignedSection) {
            unassignedSection.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      }
    }
  }, [searchParams, filter]);

  const counts = React.useMemo(() => {
    const all = departments.length;
    const empty = departments.filter(isEmpty).length;
    const unassigned = unassignedTeams.length;
    return { all, empty, unassigned };
  }, [departments, unassignedTeams]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    let base = [...departments];

    // Filter pill
    // Note: Filters affect department card visibility only, not team pill visibility within visible departments
    if (filter === "empty") base = base.filter(isEmpty);
    // "unassigned" filter is handled separately - show unassigned teams section

    // Search across department names and team names
    if (q) {
      base = base.filter((d) => {
        const depName = d.name?.toLowerCase() ?? "";
        const teamNames = (d.teams ?? []).map(t => t.name?.toLowerCase() ?? "").join(" ");
        return depName.includes(q) || teamNames.includes(q);
      });
    }

    // Sort alphabetically
    base.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

    return base;
  }, [departments, query, filter]);

  // Filter unassigned teams by search query
  const filteredUnassignedTeams = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return unassignedTeams;
    
    return unassignedTeams.filter((t) => {
      const teamName = t.name?.toLowerCase() ?? "";
      return teamName.includes(q);
    });
  }, [unassignedTeams, query]);

  // Show unassigned teams section only when there are unassigned teams.
  // Design decision: Hide section when empty (implicit good state) to keep Structure
  // calm and topology-focused, not celebratory. "Nothing there" implies success.
  const showUnassignedSection =
    (filter === "all" || filter === "unassigned") && filteredUnassignedTeams.length > 0;

  // Check if filters should be collapsed (all counts are zero except "all")
  const shouldCollapseFilters = counts.empty === 0 && counts.unassigned === 0;
  const [filtersExpanded, setFiltersExpanded] = React.useState(!shouldCollapseFilters);

  const handleOpenAssignDialog = (team: TeamLite) => {
    setSelectedTeam(team);
    setSelectedDepartmentId("");
    setAssignmentError(null); // Clear any previous errors
    setAssignDialogOpen(true);
  };

  const handleAssignDepartment = async () => {
    if (!selectedTeam) return;

    setIsAssigning(true);
    setAssignmentError(null); // Clear any previous errors
    
    try {
      const response = await fetch(`/api/org/teams/${selectedTeam.id}/department`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          departmentId: selectedDepartmentId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        // Provide more detailed error message if available
        const errorMessage = error.error?.message || "Failed to assign department";
        const errorDetails = error.error?.details;
        
        // If it's a duplicate team error, set the error state to show in dialog
        if (error.error?.code === "TEAM_EXISTS" && errorDetails) {
          setAssignmentError({
            message: errorMessage,
            details: errorDetails,
          });
          setIsAssigning(false);
          return; // Keep dialog open to show error
        }
        
        // For other errors, throw to be caught below
        throw new Error(errorMessage);
      }

      // Success - remove team from unassigned list and close dialog
      setUnassignedTeams((prev) => prev.filter((t) => t.id !== selectedTeam.id));
      setAssignmentError(null);
      setAssignDialogOpen(false);
      setSelectedTeam(null);
      setSelectedDepartmentId("");

      // Redirect to Structure page (not Department page)
      router.push("/org/structure");
      router.refresh();
    } catch (error: any) {
      console.error("Failed to assign department:", error);
      setIsAssigning(false);
      
      // Show alert for errors caught here (duplicate errors are handled above and don't reach catch)
      const errorMessage = error.message || "Failed to assign department. Please try again.";
      alert(errorMessage);
    }
  };

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-6xl px-10 pt-4 pb-10">
        <div className="space-y-6">
          {/* Header (match People layout - informational, not dominant) */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold leading-tight text-foreground">Structure</h1>
              <p className="mt-1.5 text-sm leading-6 max-w-3xl text-muted-foreground">
                Design how departments and teams are organized.
              </p>
            </div>
            <div className="shrink-0">
              <CreateDepartmentDialog />
            </div>
          </div>

          {/* Tertiary: Search + Filters (reduced contrast, collapsed when counts are zero) */}
          <div className={cn(
            "mt-6 space-y-3 transition-opacity",
            shouldCollapseFilters ? "opacity-60" : "opacity-80"
          )}>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search departments and teams..."
              className="max-w-2xl"
            />
            <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-100 transition-opacity">
                  <span className="text-sm text-muted-foreground">Filters</span>
                  {filtersExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-wrap items-center gap-2 pt-2">
              <FilterPill
                active={filter === "all"}
                label="All"
                count={counts.all}
                onClick={() => {
                  setFilter("all");
                  // Update URL to reflect filter change
                  const newUrl = new URL(window.location.href);
                  newUrl.searchParams.delete("filter");
                  if (newUrl.searchParams.toString()) {
                    router.push(newUrl.pathname + "?" + newUrl.searchParams.toString());
                  } else {
                    router.push(newUrl.pathname);
                  }
                }}
              />
              <FilterPill
                active={filter === "empty"}
                label="Empty"
                count={counts.empty}
                onClick={() => {
                  setFilter("empty");
                  // Update URL to reflect filter change
                  const newUrl = new URL(window.location.href);
                  newUrl.searchParams.set("filter", "empty");
                  router.push(newUrl.pathname + "?" + newUrl.searchParams.toString());
                }}
              />
              <FilterPill
                active={filter === "unassigned"}
                label="Unassigned"
                count={counts.unassigned}
                onClick={() => {
                  setFilter("unassigned");
                  // Update URL to reflect filter change
                  const newUrl = new URL(window.location.href);
                  newUrl.searchParams.set("filter", "unassigned");
                  router.push(newUrl.pathname + "?" + newUrl.searchParams.toString());
                  // Scroll to unassigned section
                  setTimeout(() => {
                    const unassignedSection = document.getElementById("unassigned-teams-section");
                    if (unassignedSection) {
                      unassignedSection.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }, 100);
                }}
              />
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Filters affect department visibility.
                </p>
              </CollapsibleContent>
            </Collapsible>
          </div>

      {/* Primary: Departments list */}
      <div className={cn(
        filter === "unassigned" && "opacity-80"
      )}>
        {filtered.length === 0 ? (
          <div className="py-10 text-center">
            <div className="text-base font-medium">No results</div>
            <div className="text-sm text-muted-foreground mt-1">
              Try a different search or filter.
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <div className="text-base font-semibold">Departments</div>
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-muted/30 border border-border/50 text-xs font-medium text-muted-foreground">
                  {filtered.length}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">
                Teams are grouped under departments.
              </div>
            </div>
            <div className="space-y-10">
              {filtered.map((dep) => (
                <DepartmentRow
                  key={dep.id}
                  dep={dep}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 
       * Unassigned Teams Section — State Visualization Only
       * 
       * RULES:
       * 1. Org Chart must not import:
       *    - Integrity severity
       *    - Ownership status
       *    - Issue metadata
       * 
       * 2. Org Chart renders structure only — descriptive, not prescriptive.
       * 
       * 3. Unassigned teams are neutral, informational, and non-actionable.
       * 
       * 4. No warnings, badges, or error indicators are allowed.
       */}
      {/* Secondary: Unassigned teams (only shown when teams exist - implicit good state when hidden) */}
      {showUnassignedSection && (
        <div id="unassigned-teams-section" className="mt-10 rounded-xl border border-dashed border-white/10 bg-white/[0.015]">
          <div className="px-6 py-4 border-b border-white/5">
            <div>
              <div className="text-base font-semibold text-foreground">Unassigned teams</div>
              <div className="text-sm text-muted-foreground mt-1">
                {filteredUnassignedTeams.length} {filteredUnassignedTeams.length === 1 ? 'team' : 'teams'} {filteredUnassignedTeams.length === 1 ? "isn't" : "aren't"} placed in a department yet.
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {filteredUnassignedTeams.map((team) => (
              <UnassignedTeamRow 
                key={team.id} 
                team={team}
              />
            ))}
          </div>

          {/* Footer CTA - Only show when there are unassigned teams */}
          {filteredUnassignedTeams.length > 0 && (
            <div className="px-6 pb-5 pt-3 border-t border-white/5">
              <div className="flex flex-col items-end gap-2">
                <p className="text-xs text-muted-foreground">
                  Place teams to keep topology clean.
                </p>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    if (filteredUnassignedTeams.length > 0) {
                      handleOpenAssignDialog(filteredUnassignedTeams[0]);
                    }
                  }}
                >
                  Assign to department →
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assign Department Dialog */}
      <Dialog 
        open={assignDialogOpen} 
        onOpenChange={(open) => {
          setAssignDialogOpen(open);
          if (!open) {
            // Clear error when dialog closes
            setAssignmentError(null);
            setSelectedTeam(null);
            setSelectedDepartmentId("");
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign department</DialogTitle>
            <DialogDescription>
              Select a department for {selectedTeam?.name || "this team"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Show duplicate teams error if exists */}
            {assignmentError && assignmentError.details?.allTeamsWithSameName && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="text-amber-400 text-sm font-medium">
                    Duplicate team detected
                  </div>
                </div>
                <div className="text-sm text-amber-200/80">
                  {assignmentError.message}
                </div>
                {assignmentError.details.allTeamsWithSameName.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-amber-300/80">
                      All teams named "{selectedTeam?.name}" in your organization:
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {assignmentError.details.allTeamsWithSameName.map((duplicateTeam) => (
                        <div
                          key={duplicateTeam.id}
                          className={cn(
                            "text-xs px-3 py-2 rounded border",
                            duplicateTeam.isCurrentTeam
                              ? "bg-blue-950/40 border-blue-500/40 text-blue-200"
                              : duplicateTeam.isExistingTeam
                              ? "bg-amber-950/40 border-amber-500/40 text-amber-200"
                              : "bg-slate-800/40 border-slate-700/40 text-slate-300"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{duplicateTeam.name}</span>
                            <span className="text-slate-400">
                              {duplicateTeam.isUnassigned
                                ? "Unassigned"
                                : duplicateTeam.departmentName || "Unknown"}
                            </span>
                          </div>
                          {duplicateTeam.isCurrentTeam && (
                            <div className="text-[10px] text-blue-400/80 mt-1">
                              (This team - currently unassigned)
                            </div>
                          )}
                          {duplicateTeam.isExistingTeam && (
                            <div className="text-[10px] text-amber-400/80 mt-1">
                              (Existing team in target department)
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-amber-300/60 pt-2 border-t border-amber-500/20">
                      To resolve: Rename the unassigned team or delete the duplicate before assigning to a department.
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Select
                value={selectedDepartmentId}
                onValueChange={(value) => {
                  setSelectedDepartmentId(value);
                  // Clear error when department selection changes
                  setAssignmentError(null);
                }}
                disabled={isAssigning}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a department..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignDialogOpen(false);
                setAssignmentError(null);
              }}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignDepartment}
              disabled={!selectedDepartmentId || isAssigning}
            >
              {isAssigning ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  );
}

function FilterPill({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
        active
          ? "bg-primary text-primary-foreground border-primary/40"
          : "bg-muted/30 hover:bg-muted/50"
      )}
      type="button"
    >
      <span>{label}</span>
      <span
        className={cn(
          "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs",
          active ? "bg-primary-foreground/20" : "bg-muted"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function DepartmentRow({
  dep,
}: {
  dep: DepartmentLite;
}) {
  const teamCount = countTeams(dep);
  const empty = isEmpty(dep);
  const teams = dep.teams ?? [];

  return (
    <div className="rounded-xl bg-white/[0.035] border border-white/12 ring-1 ring-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] hover:border-white/18 hover:ring-white/10 hover:bg-white/[0.045] transition-[background,border-color,box-shadow] duration-200 group cursor-default">
      <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-b from-white/6 to-transparent">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h3 className="text-lg font-semibold text-foreground truncate min-w-0">{dep.name}</h3>
              <span className="text-sm text-muted-foreground shrink-0">· {teamCount} {teamCount === 1 ? "team" : "teams"}</span>
            </div>
          </div>
          <div className="shrink-0">
            <Button 
              asChild 
              variant="ghost" 
              size="sm" 
              className="opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity text-muted-foreground"
            >
              <Link href={`/org/structure/departments/${dep.id}?from=structure`} className="flex items-center gap-1.5">
                Manage
                <ChevronRight className="h-3 w-3 opacity-60" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Team items row */}
      <div className="px-6 py-4">
        {empty ? (
          <div className="text-sm text-muted-foreground">
            No teams yet · <Link href={`/org/structure/departments/${dep.id}?from=structure`} className="underline hover:text-foreground">Assign teams →</Link>
          </div>
        ) : (
          <TeamItemsRow teams={teams} />
        )}
      </div>
    </div>
  );
}

function UnassignedTeamRow({ 
  team
}: { 
  team: TeamLite;
}) {
  return (
    <div className="px-6 py-4">
      <TeamItem team={team} />
    </div>
  );
}

const MAX_VISIBLE_TEAMS = 5;

function TeamItem({ team }: { team: TeamLite }) {
  // Generate 2-letter monogram from team name
  const initials = team.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'TM';
  
  return (
    <Link
      href={`/org/structure/teams/${team.id}?from=structure`}
      className="group flex items-center gap-2 h-9 px-4 rounded-md bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 hover:ring-1 hover:ring-primary/25 active:scale-[0.99] transition-all duration-150 text-sm font-medium tracking-tight text-foreground cursor-pointer focus-visible:outline-none focus-visible:bg-white/8 focus-visible:border-white/20 focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <div className="flex items-center justify-center h-5 w-5 rounded-full bg-white/5 border border-white/10 shrink-0 text-[10px] font-medium text-muted-foreground group-hover:border-white/20 group-hover:bg-white/8 group-hover:text-foreground group-focus-visible:border-white/20 group-focus-visible:bg-white/8 group-focus-visible:text-foreground transition-all duration-150">
        {initials}
      </div>
      <span className="truncate">{team.name}</span>
    </Link>
  );
}

function TeamItemsRow({ teams }: { teams: TeamLite[] }) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const shouldTruncate = teams.length > MAX_VISIBLE_TEAMS;
  const visibleTeams = shouldTruncate && !isExpanded 
    ? teams.slice(0, MAX_VISIBLE_TEAMS)
    : teams;
  const hiddenCount = teams.length - MAX_VISIBLE_TEAMS;

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
      {visibleTeams.map((team) => (
        <TeamItem key={team.id} team={team} />
      ))}
      {shouldTruncate && !isExpanded && (
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded(true)}
          className="flex items-center h-9 px-4 rounded-md bg-muted/10 border border-border/30 hover:bg-muted/20 text-xs text-muted-foreground hover:text-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          +{hiddenCount} more
        </button>
      )}
    </div>
  );
}

