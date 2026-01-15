"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";

type AvailabilityRollup = {
  availableCount: number;
  partialCount: number;
  unavailableCount: number;
  totalMembers: number;
};

type PersonLite = { id: string; name: string };
type TeamLite = { id: string; name: string; ownerPerson?: PersonLite | null };
type DepartmentLite = {
  id: string;
  name: string;
  ownerPerson?: PersonLite | null;
  teams?: TeamLite[] | null;
};

type FilterKey = "all" | "missingOwner" | "empty" | "unassigned";

function hasMissingOwner(dep: DepartmentLite) {
  // "Missing owner" = no department owner OR any team without owner
  const depMissing = !dep.ownerPerson;
  const teams = dep.teams ?? [];
  const anyTeamMissing = teams.some((t) => !t.ownerPerson);
  return depMissing || anyTeamMissing;
}

function isEmpty(dep: DepartmentLite) {
  const teams = dep.teams ?? [];
  return teams.length === 0;
}

function formatOwner(p?: PersonLite | null) {
  return p?.name?.trim() ? p.name : "Unassigned";
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
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<FilterKey>("all");
  const [unassignedTeams, setUnassignedTeams] = React.useState(initialUnassignedTeams);
  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState<TeamLite | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState<string>("");
  const [isAssigning, setIsAssigning] = React.useState(false);

  // Fetch availability rollups
  const availabilityQ = useOrgQuery(
    () => OrgApi.getStructureAvailabilityRollups(),
    []
  );
  const deptRollups = availabilityQ.data?.departments ?? {};
  const teamRollups = availabilityQ.data?.teams ?? {};

  const counts = React.useMemo(() => {
    const all = departments.length;
    const missingOwner = departments.filter(hasMissingOwner).length;
    const empty = departments.filter(isEmpty).length;
    const unassigned = unassignedTeams.length;
    return { all, missingOwner, empty, unassigned };
  }, [departments, unassignedTeams]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    let base = [...departments];

    // Filter pill
    if (filter === "missingOwner") base = base.filter(hasMissingOwner);
    if (filter === "empty") base = base.filter(isEmpty);
    // "unassigned" filter is handled separately - show unassigned teams section

    // Search across department names + owners
    if (q) {
      base = base.filter((d) => {
        const depName = d.name?.toLowerCase() ?? "";
        const depOwner = d.ownerPerson?.name?.toLowerCase() ?? "";
        return depName.includes(q) || depOwner.includes(q);
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
      const teamOwner = t.ownerPerson?.name?.toLowerCase() ?? "";
      return teamName.includes(q) || teamOwner.includes(q);
    });
  }, [unassignedTeams, query]);

  // Show unassigned teams section if:
  // - Filter is "all" or "unassigned"
  // - There are unassigned teams (after search filter)
  const showUnassignedSection =
    (filter === "all" || filter === "unassigned") && filteredUnassignedTeams.length > 0;

    const handleOpenAssignDialog = (team: TeamLite) => {
      setSelectedTeam(team);
      setSelectedDepartmentId("");
      setAssignDialogOpen(true);
    };
  
    const handleAssignDepartment = async () => {
      if (!selectedTeam) return;
  
      setIsAssigning(true);
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
          throw new Error(error.error?.message || "Failed to assign department");
        }
  
        // Remove team from unassigned list
        setUnassignedTeams((prev) => prev.filter((t) => t.id !== selectedTeam.id));
        setAssignDialogOpen(false);
        setSelectedTeam(null);
        setSelectedDepartmentId("");
  
        // Refresh the page to update the structure
        router.refresh();
      } catch (error: any) {
        console.error("Failed to assign department:", error);
        alert(error.message || "Failed to assign department. Please try again.");
      } finally {
        setIsAssigning(false);
      }
    };

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-6xl px-6 pt-3 pb-8">
        <div className="space-y-4">
          {/* Header (match People layout - informational, not dominant) */}
          <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
              <h1 className="text-xl font-semibold leading-tight text-foreground">Structure</h1>
              <p className="mt-1.5 text-sm leading-6 max-w-3xl text-muted-foreground">
                Design how departments and teams are organized.
              </p>
            </div>

            <div className="shrink-0">
              <Button asChild variant="secondary">
                <Link href="/org/structure/departments/new">Add department</Link>
              </Button>
            </div>
          </div>

      {/* Search + Filters (control block, separated from header) */}
      <div className="mt-6 space-y-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search departments and teams..."
              className="max-w-2xl"
            />
            <div className="flex flex-wrap items-center gap-2">
              <FilterPill
                active={filter === "all"}
                label="All"
                count={counts.all}
                onClick={() => setFilter("all")}
              />
              <FilterPill
                active={filter === "missingOwner"}
                label="Missing owner"
                count={counts.missingOwner}
                onClick={() => setFilter("missingOwner")}
              />
              <FilterPill
                active={filter === "empty"}
                label="Empty"
                count={counts.empty}
                onClick={() => setFilter("empty")}
              />
              <FilterPill
                active={filter === "unassigned"}
                label="Unassigned"
                count={counts.unassigned}
                onClick={() => setFilter("unassigned")}
              />
            </div>
          </div>

      {/* Departments list */}
      <div className="rounded-xl border bg-card">
        <div className="px-5 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold">Departments</div>
              <div className="text-sm text-muted-foreground">
                {filtered.length} of {departments.length} shown
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="text-base font-medium">No results</div>
              <div className="text-sm text-muted-foreground mt-1">
                Try a different search or filter.
              </div>
            </div>
          ) : (
            filtered.map((dep) => (
              <DepartmentRow
                key={dep.id}
                dep={dep}
                rollup={deptRollups[dep.id]}
                teamRollups={teamRollups}
              />
            ))
          )}
        </div>
      </div>

      {/* Unassigned teams section */}
      {showUnassignedSection && (
        <div className="rounded-xl border bg-card">
          <div className="px-5 py-4 border-b">
            <div>
              <div className="text-base font-semibold">Unassigned teams</div>
              <div className="text-sm text-muted-foreground">
                Teams not linked to a department.
              </div>
            </div>
          </div>

          <div className="divide-y divide-border">
            {filteredUnassignedTeams.map((team) => (
              <UnassignedTeamRow 
              key={team.id} 
              team={team}
              onAssignClick={handleOpenAssignDialog}
            />
            ))}
          </div>
        </div>
      )}

      {/* Assign Department Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign department</DialogTitle>
            <DialogDescription>
              Select a department for {selectedTeam?.name || "this team"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Select
                value={selectedDepartmentId}
                onValueChange={setSelectedDepartmentId}
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
              onClick={() => setAssignDialogOpen(false)}
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
  rollup,
  teamRollups,
}: {
  dep: DepartmentLite;
  rollup?: AvailabilityRollup;
  teamRollups?: Record<string, AvailabilityRollup>;
}) {
  const teamCount = countTeams(dep);
  const missingOwner = hasMissingOwner(dep);
  const empty = isEmpty(dep);

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Primary info */}
        <div className="min-w-0 flex-1">
          {/* Department name (dominant) */}
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground truncate">{dep.name}</h3>
            {missingOwner && <Tag label="Missing owner" />}
            {empty && <Tag label="Empty" />}
          </div>

          {/* Meta line: team count + owner (secondary, muted) */}
          <div className="mt-1 text-sm text-muted-foreground">
            {teamCount} {teamCount === 1 ? "team" : "teams"} · Owner: {formatOwner(dep.ownerPerson)}
          </div>
        </div>

        {/* Middle: Availability rollup */}
        {rollup && rollup.totalMembers > 0 && (
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <AvailabilityRollupBadges rollup={rollup} />
          </div>
        )}

        {/* Right: Action */}
        <div className="shrink-0">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/org/structure/departments/${dep.id}`}>Manage →</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function UnassignedTeamRow({ 
  team, 
  onAssignClick 
}: { 
  team: TeamLite;
  onAssignClick: (team: TeamLite) => void;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left */}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-foreground">{team.name}</h3>
          <div className="mt-1 text-sm text-muted-foreground">
            Owner: {formatOwner(team.ownerPerson)}
          </div>
        </div>

        {/* Right */}
        <div className="shrink-0">
        <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onAssignClick(team)}
          >
            Assign department
          </Button>
        </div>
      </div>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/50 bg-muted/20 px-2 py-0.5 text-xs text-muted-foreground/80">
      {label}
    </span>
  );
}

/**
 * Availability Rollup Badges
 * 
 * Displays availability counts: Available / Limited / Unavailable
 * Neutral labels only - no interpretation.
 */
function AvailabilityRollupBadges({ rollup }: { rollup: AvailabilityRollup }) {
  const { availableCount, partialCount, unavailableCount } = rollup;

  return (
    <div className="flex items-center gap-2 text-xs">
      {availableCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
          <span className="font-medium">{availableCount}</span>
          <span className="text-green-400/70">Available</span>
        </span>
      )}
      {partialCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <span className="font-medium">{partialCount}</span>
          <span className="text-amber-400/70">Limited</span>
        </span>
      )}
      {unavailableCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
          <span className="font-medium">{unavailableCount}</span>
          <span className="text-red-400/70">Unavailable</span>
        </span>
      )}
    </div>
  );
}

