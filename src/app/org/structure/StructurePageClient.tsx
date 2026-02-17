// @ts-nocheck
/**
 * Structure Page Client Component
 * 
 * PERFORMANCE: Uses startTransition for tab switches to keep UI responsive.
 */

"use client";

import { useState, Suspense, startTransition, useCallback, memo, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { OrgTabNav, type OrgTab } from "@/components/org/OrgTabNav";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgNoAccessState } from "@/components/org/OrgNoAccessState";
import { canRole } from "@/lib/orgPermissions";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { HelpTip } from "@/components/ui/HelpTip";
import { isOrgNoAccessError } from "@/lib/orgErrorUtils";
import { useOrgStructureLists } from "@/hooks/useOrgStructureLists";
import { CreateTeamDialogInlineTrigger } from "@/components/org/structure/CreateTeamDialog";
import { CreateDepartmentDialogInlineTrigger } from "@/components/org/structure/CreateDepartmentDialog";
import { EditDepartmentDialog } from "@/components/org/structure/EditDepartmentDialog";
import { CreateRoleDialogInlineTrigger } from "@/components/org/structure/CreateRoleDialog";
import type {
  StructureTeam,
  StructureDepartment,
  StructureRole,
} from "@/types/org";
import { TeamsDragList } from "@/components/org/structure/TeamsDragList";
import { cn } from "@/lib/utils";
import type { OrgRole } from "@/lib/org/capabilities";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { surfaceCardClass, surfaceCardHoverClass, focusRingClass } from "@/components/org/people/people-styles";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/org/personDisplay";
import { MoreVertical, Eye, Edit, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IntegrityBanner } from "@/components/org/IntegrityBanner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CapacityStatusDot } from "@/components/org/capacity/CapacityStatusBadge";
import { useCapacityTeams, type TeamCapacityRow } from "@/hooks/useCapacityTeams";

const STRUCTURE_TABS: OrgTab[] = [
  { id: "teams", label: "Teams" },
  { id: "departments", label: "Departments" },
  { id: "roles", label: "Roles" },
];

type StructurePageClientProps = {
  orgId: string;
  role: OrgRole;
  initialTeams: StructureTeam[];
  initialDepartments: StructureDepartment[];
  initialRoles: StructureRole[];
  topDepartmentsInsights?: Array<{ name: string; headcount: number }> | null;
};

export function StructurePageClient({
  orgId,
  role,
  initialTeams,
  initialDepartments,
  initialRoles,
  topDepartmentsInsights,
}: StructurePageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  // If departmentId is present, default to departments tab
  const tabParam = searchParams.get("tab");
  const filterParam = searchParams.get("filter"); // Read filter param
  const highlightDepartmentId = searchParams.get("departmentId");
  const initialTab = highlightDepartmentId 
    ? "departments" 
    : (tabParam ?? "teams");
  const highlightTeamId = searchParams.get("teamId");
  const justCreated = searchParams.get("created");
  const panelParam = searchParams.get("panel");

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const canManageStructure = canRole(role, "manageStructure");
  const unassignedSectionRef = useRef<HTMLDivElement | null>(null);
  const { teamCapacityMap } = useCapacityTeams();

  // Assign-department deep-link dialog state
  const [assignDeptDialogTeamId, setAssignDeptDialogTeamId] = useState<string | null>(null);
  const [assignDeptSelectedId, setAssignDeptSelectedId] = useState<string>("");
  const [assignDeptSaving, setAssignDeptSaving] = useState(false);
  const [assignDeptError, setAssignDeptError] = useState<string | null>(null);
  const assignDeptDeepLinkHandled = useRef(false);

  // Sync activeTab when URL params change (e.g., departmentId present should show departments tab)
  useEffect(() => {
    if (highlightDepartmentId && activeTab !== "departments") {
      setActiveTab("departments");
    }
    // Also handle filter param - if filter=unassigned and tab=teams, switch to teams tab
    if (filterParam === "unassigned" && tabParam === "teams" && activeTab !== "teams") {
      setActiveTab("teams");
      // Scroll to teams section after tab switch
      setTimeout(() => {
        const teamsSection = document.getElementById("teams-tab-section");
        if (teamsSection) {
          teamsSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
    }
  }, [highlightDepartmentId, activeTab, filterParam, tabParam]);

  // PERFORMANCE: Use startTransition to keep UI responsive during tab switches
  const handleTabChange = useCallback((tabId: string) => {
    startTransition(() => {
      setActiveTab(tabId);
    });
  }, []);
  
  // Use hook for real-time updates, but fall back to initial data
  const { teams: hookTeams, departments: hookDepartments, roles: hookRoles, isLoading, error } = useOrgStructureLists();
  // Only use hook data if it's actually loaded (isLoading === false) and not null
  // If hook is still loading or returned null (error), use initial data from server
  // If hook finished loading and returned empty arrays, that's valid (no data exists)
  const teams = (!isLoading && hookTeams !== null) ? hookTeams : initialTeams;
  const departments = (!isLoading && hookDepartments !== null) ? hookDepartments : initialDepartments;
  const roles = (!isLoading && hookRoles !== null) ? hookRoles : initialRoles;
  const noAccess = isOrgNoAccessError(error);

  // Deep-link: ?panel=assignDepartment&teamId=... opens the assign-department dialog
  useEffect(() => {
    if (assignDeptDeepLinkHandled.current) return;
    if (panelParam !== "assignDepartment" || !highlightTeamId) return;
    // Wait for teams to load
    if (!teams || teams.length === 0) return;

    const team = teams.find((t) => t.id === highlightTeamId);
    // Failure behavior: if team doesn't exist or already has a department, no-op and clear params
    if (!team || team.departmentId !== null) {
      assignDeptDeepLinkHandled.current = true;
      router.replace("/org/structure?tab=teams");
      return;
    }

    assignDeptDeepLinkHandled.current = true;
    setActiveTab("teams");
    setAssignDeptDialogTeamId(highlightTeamId);
  }, [panelParam, highlightTeamId, teams, router]);

  // Handler: save department assignment
  const handleAssignDepartmentSave = useCallback(async () => {
    if (!assignDeptDialogTeamId || !assignDeptSelectedId) return;
    setAssignDeptSaving(true);
    setAssignDeptError(null);
    try {
      const res = await fetch(`/api/org/teams/${assignDeptDialogTeamId}/department`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId: assignDeptSelectedId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAssignDeptError(json?.error?.message ?? "Failed to assign department.");
        return;
      }
      // Success: close dialog, clear params, refetch
      setAssignDeptDialogTeamId(null);
      setAssignDeptSelectedId("");
      router.replace("/org/structure?tab=teams");
      router.refresh();
    } catch (err: unknown) {
      setAssignDeptError(err instanceof Error ? err.message : "Failed to assign department.");
    } finally {
      setAssignDeptSaving(false);
    }
  }, [assignDeptDialogTeamId, assignDeptSelectedId, router]);

  // Load people for owner dropdowns
  const peopleQ = useOrgQuery(() => OrgApi.listPeople(), []);
  const people = peopleQ.data?.people ?? [];

  const handleReorderTeams = useCallback(async (
    departmentId: string,
    updates: { id: string; position: number }[]
  ) => {
    try {
      const res = await fetch("/api/org/teams/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("[StructurePageClient] Failed to reorder teams:", error);
    }
  }, [router]);

  // Get department options for CreateTeamDialog (memoized to prevent recreation)
  const departmentOptions = useMemo(() => 
    departments.map((d) => ({
      id: d.id,
      name: d.name,
    })),
    [departments]
  );

  return (
    <div className="px-10 pb-10">
      {/* Tab navigation - consistent placement under header */}
      <div className="mt-6 mb-6">
        <OrgTabNav
          tabs={STRUCTURE_TABS}
          activeId={activeTab}
          onChange={handleTabChange}
        />
      </div>

      {/* Integrity banner */}
      <IntegrityBanner />

      {/* Show error state if API failed */}
      {error && !noAccess && (
        <div className="rounded-2xl border border-red-900/60 bg-red-950/60 px-6 py-6 text-[13px] text-red-100">
          <div className="font-semibold">Error loading structure</div>
          <div className="mt-2 text-red-200">
            {error || "Failed to load organizational structure. Please try refreshing the page."}
          </div>
        </div>
      )}

      {noAccess ? (
        <OrgNoAccessState />
      ) : !error ? (
        <>
          {activeTab === "teams" && (
            <div id="teams-tab-section">
              <TeamsTab
                teams={teams}
                highlightTeamId={highlightTeamId}
                justCreated={justCreated}
                canManageStructure={canManageStructure}
                departmentOptions={departmentOptions}
                highlightDepartmentId={highlightDepartmentId}
                people={people}
                onRefresh={() => router.refresh()}
                teamCapacityMap={teamCapacityMap}
              />
            </div>
          )}

          {activeTab === "departments" && (
            <DepartmentsTab
              departments={departments}
              highlightDepartmentId={highlightDepartmentId}
              justCreated={justCreated}
              canManageStructure={canManageStructure}
              teams={teams}
              onReorderTeams={handleReorderTeams}
              topDepartmentsInsights={topDepartmentsInsights}
              people={people}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              teamCapacityMap={teamCapacityMap}
            />
          )}

          {activeTab === "roles" && (
            <RolesTab
              roles={roles}
              canManageStructure={canManageStructure}
            />
          )}
        </>
      ) : null}

      {/* Assign Department Dialog (deep-link driven) */}
      <Dialog
        open={!!assignDeptDialogTeamId}
        onOpenChange={(open) => {
          if (!open) {
            setAssignDeptDialogTeamId(null);
            setAssignDeptSelectedId("");
            setAssignDeptError(null);
            router.replace("/org/structure?tab=teams");
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Assign department</DialogTitle>
            <DialogDescription>
              Choose a department for{" "}
              <span className="font-medium text-slate-200">
                {teams.find((t) => t.id === assignDeptDialogTeamId)?.name ?? "this team"}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={assignDeptSelectedId}
              onValueChange={setAssignDeptSelectedId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assignDeptError && (
              <p className="mt-2 text-sm text-red-400">{assignDeptError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setAssignDeptDialogTeamId(null);
                setAssignDeptSelectedId("");
                setAssignDeptError(null);
                router.replace("/org/structure?tab=teams");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!assignDeptSelectedId || assignDeptSaving}
              onClick={handleAssignDepartmentSave}
            >
              {assignDeptSaving ? "Saving..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const TeamsTab = memo(function TeamsTab({
  teams,
  highlightTeamId,
  justCreated,
  canManageStructure,
  departmentOptions,
  highlightDepartmentId,
  people,
  onRefresh,
}: {
  teams: StructureTeam[];
  highlightTeamId: string | null;
  justCreated: string | null;
  canManageStructure: boolean;
  departmentOptions: { id: string; name: string }[];
  highlightDepartmentId: string | null;
  people: Array<{ id: string; fullName: string }>;
  onRefresh: () => void;
  teamCapacityMap?: Map<string, TeamCapacityRow>;
}) {
  const [savingOwner, setSavingOwner] = useState<Record<string, boolean>>({});
  const [ownerErrors, setOwnerErrors] = useState<Record<string, string | null>>({});
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<Record<string, string | "__none__">>({});

  // Initialize selected owner IDs when teams change
  useEffect(() => {
    const ownerMap: Record<string, string | "__none__"> = {};
    teams.forEach((team) => {
      ownerMap[team.id] = team.ownerPersonId ?? "__none__";
    });
    setSelectedOwnerIds(ownerMap);
  }, [teams]);

  const handleSetOwner = useCallback(async (teamId: string, ownerPersonId: string | "__none__") => {
    setSelectedOwnerIds((prev) => ({ ...prev, [teamId]: ownerPersonId }));
    setSavingOwner((prev) => ({ ...prev, [teamId]: true }));
    setOwnerErrors((prev) => ({ ...prev, [teamId]: null }));

    try {
      await OrgApi.setTeamOwner(teamId, {
        ownerPersonId: ownerPersonId === "__none__" ? null : ownerPersonId,
      });
      onRefresh();
    } catch (error: any) {
      // Only show error if API actually failed
      const errorMessage = error?.message || "Failed to set team owner";
      setOwnerErrors((prev) => ({ ...prev, [teamId]: errorMessage }));
      // Reset selection on error
      const team = teams.find((t) => t.id === teamId);
      setSelectedOwnerIds((prev) => ({ ...prev, [teamId]: team?.ownerPersonId ?? "__none__" }));
    } finally {
      setSavingOwner((prev) => ({ ...prev, [teamId]: false }));
    }
  }, [teams, onRefresh]);
  if (!teams.length) {
    return (
      <OrgEmptyState
        title="No teams yet"
        description="Teams group people around clear responsibilities and execution. Create your first team, then assign people and owners."
        primaryAction={
          canManageStructure ? (
            <CreateTeamDialogInlineTrigger
              departments={departmentOptions}
              defaultDepartmentId={highlightDepartmentId ?? undefined}
            />
          ) : undefined
        }
      />
    );
  }

  return (
    <section id="teams-tab-content" className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-sm font-medium text-slate-100">
            Teams <HelpTip text="Teams are groups of people working together on specific projects, products, or functions." />
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Groups of people working together on specific projects or functions.
          </p>
        </div>
        {canManageStructure && (
          <CreateTeamDialogInlineTrigger
            departments={departmentOptions}
            defaultDepartmentId={highlightDepartmentId ?? undefined}
          />
        )}
      </div>

      <div className="space-y-3">
        {teams.map((team) => {
          const highlighted = highlightTeamId === team.id;
          const currentOwnerId = selectedOwnerIds[team.id] ?? (team.ownerPersonId ?? "__none__");
          const isSavingOwner = savingOwner[team.id] || false;
          const ownerError = ownerErrors[team.id];
          const justCreatedThis = justCreated === team.id;

          return (
            <div
              key={team.id}
              className={cn(
                surfaceCardClass,
                surfaceCardHoverClass,
                focusRingClass,
                "p-4",
                highlighted && "border-primary/50 ring-2 ring-primary/30",
                justCreatedThis && "border-[#5CA9FF]/30"
              )}
            >
              {/* Header: Name, badge, member count */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[14px] font-semibold text-slate-50 truncate">
                      {team.name}
                    </h3>
                    {teamCapacityMap?.get(team.id) && (
                      <CapacityStatusDot status={teamCapacityMap.get(team.id)!.status} />
                    )}
                    {justCreatedThis && (
                      <span className="rounded-full bg-[#5CA9FF]/20 px-2 py-[2px] text-[10px] font-medium text-[#5CA9FF] shrink-0">
                        New
                      </span>
                    )}
                  </div>
                  {/* Secondary: Department */}
                  <div className="text-[12px] font-medium text-slate-400">
                    {team.departmentName ? (
                      <span>{team.departmentName}</span>
                    ) : (
                      <span className="italic text-slate-500">No department</span>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 shrink-0 flex items-center gap-2">
                  {(() => {
                    const cap = teamCapacityMap?.get(team.id);
                    if (cap && cap.availableHours > 0) {
                      return (
                        <span className="text-[10px] text-slate-500">
                          {cap.utilizationPct}% util
                        </span>
                      );
                    }
                    return null;
                  })()}
                  <span>{team.memberCount} {team.memberCount === 1 ? "member" : "members"}</span>
                </div>
              </div>

              {/* Actions and metadata row */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
                <div className="flex items-center gap-3 text-[11px]">
                  {/* Owner display - inline with avatar */}
                  {(() => {
                    const owner = team.ownerPersonId
                      ? people.find((p) => p.id === team.ownerPersonId)
                      : null;
                    if (owner) {
                      return (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Avatar className="h-5 w-5 border border-white/10">
                            <AvatarFallback className="bg-slate-800 text-[10px] text-slate-300">
                              {getInitials({ fullName: owner.fullName, email: null })}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-slate-400">{owner.fullName}</span>
                        </div>
                      );
                    }
                    return (
                      <span className="text-slate-500 italic text-[11px]">No owner</span>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  {/* 3-dot menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="p-1.5 rounded-md hover:bg-slate-800/50 transition-colors text-slate-400 hover:text-slate-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href={`/org/directory?teamId=${team.id}`} className="cursor-pointer">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      {canManageStructure && (
                        <>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/org/structure?tab=teams&teamId=${team.id}`}
                              className="cursor-pointer"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              // Open owner select
                              const selectId = `owner-select-${team.id}`;
                              const selectTrigger = document.getElementById(selectId) as HTMLElement;
                              selectTrigger?.click();
                            }}
                            className="cursor-pointer"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Set owner
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {/* Owner select - accessible via menu */}
                  {canManageStructure && (
                    <Select
                      disabled={isSavingOwner}
                      value={currentOwnerId}
                      onValueChange={(v) => handleSetOwner(team.id, v)}
                    >
                      <SelectTrigger
                        id={`owner-select-${team.id}`}
                        className={cn(
                          "h-7 bg-slate-900/50 border-white/10 text-[11px] w-32",
                          "hover:border-white/20 focus:ring-primary/60",
                          currentOwnerId === "__none__" ? "text-slate-500 italic" : "text-slate-300",
                          isSavingOwner && "opacity-50"
                        )}
                      >
                        <SelectValue placeholder="Assign owner…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No owner</SelectItem>
                        {people.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Owner error message */}
              {ownerError && (
                <div className="mt-2 text-[10px] text-red-400">
                  {ownerError}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
});

const DepartmentsTab = memo(function DepartmentsTab({
  departments,
  highlightDepartmentId,
  justCreated,
  canManageStructure,
  teams,
  onReorderTeams,
  topDepartmentsInsights,
  people,
  activeTab,
  onTabChange,
}: {
  departments: StructureDepartment[];
  highlightDepartmentId: string | null;
  justCreated: string | null;
  canManageStructure: boolean;
  teams: StructureTeam[];
  onReorderTeams: (departmentId: string, updates: { id: string; position: number }[]) => Promise<void>;
  topDepartmentsInsights?: Array<{ name: string; headcount: number }> | null;
  people: Array<{ id: string; fullName: string }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  teamCapacityMap?: Map<string, TeamCapacityRow>;
}) {
  const router = useRouter();
  const [savingOwner, setSavingOwner] = useState<Record<string, boolean>>({});
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<Record<string, string | "__none__">>({});
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);

  // Initialize selected owner IDs when teams change
  useEffect(() => {
    const ownerMap: Record<string, string | "__none__"> = {};
    teams.forEach((team) => {
      ownerMap[team.id] = team.ownerPersonId ?? "__none__";
    });
    setSelectedOwnerIds(ownerMap);
  }, [teams]);

  const handleSetOwner = useCallback(async (teamId: string, ownerPersonId: string | "__none__") => {
    setSelectedOwnerIds((prev) => ({ ...prev, [teamId]: ownerPersonId }));
    setSavingOwner((prev) => ({ ...prev, [teamId]: true }));

    try {
      await OrgApi.setTeamOwner(teamId, {
        ownerPersonId: ownerPersonId === "__none__" ? null : ownerPersonId,
      });
      router.refresh();
    } catch (error: any) {
      console.error("Failed to set team owner:", error);
      const team = teams.find((t) => t.id === teamId);
      setSelectedOwnerIds((prev) => ({ ...prev, [teamId]: team?.ownerPersonId ?? "__none__" }));
    } finally {
      setSavingOwner((prev) => ({ ...prev, [teamId]: false }));
    }
  }, [teams, router]);

  const handleSetDepartmentOwner = useCallback(async (departmentId: string, ownerPersonId: string | "__none__") => {
    setSelectedOwnerIds((prev) => ({ ...prev, [`dept-${departmentId}`]: ownerPersonId }));
    setSavingOwner((prev) => ({ ...prev, [`dept-${departmentId}`]: true }));

    try {
      await OrgApi.setDepartmentOwner(departmentId, {
        ownerPersonId: ownerPersonId === "__none__" ? null : ownerPersonId,
      });
      router.refresh();
    } catch (error: any) {
      console.error("Failed to set department owner:", error);
      const dept = departments.find((d) => d.id === departmentId);
      setSelectedOwnerIds((prev) => ({ ...prev, [`dept-${departmentId}`]: dept?.ownerPersonId ?? "__none__" }));
    } finally {
      setSavingOwner((prev) => ({ ...prev, [`dept-${departmentId}`]: false }));
    }
  }, [departments, router]);

  // Separate teams by department and unassigned
  const teamsByDepartment = useMemo(() => {
    const grouped = new Map<string, StructureTeam[]>();
    departments.forEach(dept => {
      grouped.set(dept.id, []);
    });
    
    const unassigned: StructureTeam[] = [];
    
    teams.forEach(team => {
      if (team.departmentId && grouped.has(team.departmentId)) {
        grouped.get(team.departmentId)!.push(team);
      } else {
        unassigned.push(team);
      }
    });
    
    return { grouped, unassigned };
  }, [departments, teams]);

  // Only show empty state if there are truly no departments AND no teams
  // If any structure exists, show the normal view
  if (departments.length === 0 && teams.length === 0) {
    return (
      <OrgEmptyState
        title="Define your structure"
        description="Create departments or teams so people have a place in the org."
        primaryAction={
          canManageStructure ? <CreateDepartmentDialogInlineTrigger /> : undefined
        }
      />
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Departments <HelpTip text="Departments are high-level organizational units that group multiple teams. Examples: Engineering, Product, Operations, Sales." />
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Organizational structure with teams nested under departments.
          </p>
        </div>
        {canManageStructure && (
          <CreateDepartmentDialogInlineTrigger />
        )}
      </div>

      {/* Departments with nested teams */}
      {departments.length > 0 && (
        <div className="space-y-4">
          {departments.map((d) => {
            const highlighted = highlightDepartmentId === d.id;
            const deptTeams = teamsByDepartment.grouped.get(d.id) ?? [];
            const justCreatedThis = justCreated === d.id;

            return (
              <div
                key={d.id}
                className={cn(
                  "rounded-2xl border border-white/10 bg-slate-900/60 shadow-sm",
                  highlighted && "border-primary/50 ring-2 ring-primary/30",
                  justCreatedThis && "border-[#5CA9FF]/30"
                )}
              >
                {/* Department header - visually dominant */}
                <div className="p-5 border-b border-white/5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-slate-50">
                          {d.name}
                        </h3>
                        {justCreatedThis && (
                          <span className="rounded-full bg-[#5CA9FF]/20 px-2 py-1 text-[10px] font-medium text-[#5CA9FF] shrink-0">
                            New
                          </span>
                        )}
                        {!d.ownerPersonId && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Needs owner
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        <span>{deptTeams.length} {deptTeams.length === 1 ? "team" : "teams"}</span>
                        {/* Department utilization (weighted average) */}
                        {teamCapacityMap && (() => {
                          let totalAvail = 0;
                          let totalAlloc = 0;
                          for (const dt of deptTeams) {
                            const cap = teamCapacityMap.get(dt.id);
                            if (cap) {
                              totalAvail += cap.availableHours;
                              totalAlloc += cap.allocatedHours;
                            }
                          }
                          if (totalAvail === 0 && deptTeams.length > 0) {
                            return <span className="text-[11px] text-slate-500">No capacity</span>;
                          }
                          if (totalAvail > 0) {
                            const pct = Math.round((totalAlloc / totalAvail) * 100);
                            return <span className="text-[11px] text-slate-500">{pct}% util</span>;
                          }
                          return null;
                        })()}
                        {/* Owner display - inline with avatar */}
                        {d.ownerPersonId && (() => {
                          const owner = people.find((p) => p.id === d.ownerPersonId);
                          if (owner) {
                            return (
                              <div className="flex items-center gap-1.5">
                                <Avatar className="h-4 w-4 border border-white/10">
                                  <AvatarFallback className="bg-slate-800 text-[9px] text-slate-300">
                                    {getInitials({ fullName: owner.fullName, email: null })}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-slate-400">{owner.fullName}</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* 3-dot menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-1.5 rounded-md hover:bg-slate-800/50 transition-colors text-slate-400 hover:text-slate-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href={`/org/directory?departmentId=${d.id}`} className="cursor-pointer">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          {canManageStructure && (
                            <>
                              <DropdownMenuItem
                                onSelect={() => setEditingDepartmentId(d.id)}
                                className="cursor-pointer"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  const selectId = `dept-owner-select-${d.id}`;
                                  const selectTrigger = document.getElementById(selectId) as HTMLElement;
                                  selectTrigger?.click();
                                }}
                                className="cursor-pointer"
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Set owner
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {/* Owner select - accessible via menu */}
                      {canManageStructure && (
                        <Select
                          disabled={savingOwner[`dept-${d.id}`] || false}
                          value={selectedOwnerIds[`dept-${d.id}`] ?? (d.ownerPersonId ?? "__none__")}
                          onValueChange={(v) => handleSetDepartmentOwner(d.id, v)}
                        >
                          <SelectTrigger
                            id={`dept-owner-select-${d.id}`}
                            className={cn(
                              "h-7 bg-slate-900/50 border-white/10 text-[11px] w-32",
                              "hover:border-white/20 focus:ring-primary/60",
                              (!d.ownerPersonId || selectedOwnerIds[`dept-${d.id}`] === "__none__") ? "text-slate-500 italic" : "text-slate-300",
                              savingOwner[`dept-${d.id}`] && "opacity-50"
                            )}
                          >
                            <SelectValue placeholder="Assign owner…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No owner</SelectItem>
                            {people.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nested teams */}
                {deptTeams.length > 0 ? (
                  <div className="p-5 pt-4 space-y-2">
                    {deptTeams.map((team) => {
                      const currentOwnerId = selectedOwnerIds[team.id] ?? (team.ownerPersonId ?? "__none__");
                      const isSavingOwner = savingOwner[team.id] || false;
                      const ownerPerson = people.find(p => p.id === team.ownerPersonId);

                      return (
                        <div
                          key={team.id}
                          className="rounded-lg border border-white/5 bg-slate-900/40 p-3 hover:border-white/10 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <h4 className="text-sm font-medium text-slate-100">
                                  {team.name}
                                </h4>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-400">
                                <span>{team.memberCount} {team.memberCount === 1 ? "member" : "members"}</span>
                                <span>•</span>
                                {canManageStructure ? (
                                  <Select
                                    disabled={isSavingOwner}
                                    value={currentOwnerId}
                                    onValueChange={(v) => handleSetOwner(team.id, v)}
                                  >
                                    <SelectTrigger className={cn(
                                      "border-none bg-transparent p-0 text-xs h-auto",
                                      currentOwnerId === "__none__" ? "text-slate-500 italic" : "text-slate-400",
                                      "hover:text-slate-300 focus:ring-0"
                                    )}>
                                      <SelectValue>
                                        {currentOwnerId === "__none__" ? "No owner" : (ownerPerson?.fullName || "No owner")}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">No owner</SelectItem>
                                      {people.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                          {p.fullName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span>{ownerPerson?.fullName || "No owner"}</span>
                                )}
                              </div>
                            </div>
                            <Link
                              href={`/org/directory?teamId=${team.id}`}
                              className="text-xs text-blue-400 hover:text-blue-300 hover:underline shrink-0"
                            >
                              View
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-5 pt-4">
                    <p className="text-sm text-slate-500 italic">
                      {canManageStructure 
                        ? "Add teams to this department next" 
                        : "No teams yet"}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Department Dialog */}
      {editingDepartmentId && (() => {
        const dept = departments.find((d) => d.id === editingDepartmentId);
        return dept ? (
          <EditDepartmentDialog
            department={dept}
            open={!!editingDepartmentId}
            onOpenChange={(open) => {
              if (!open) setEditingDepartmentId(null);
            }}
          />
        ) : null;
      })()}

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
      {teamsByDepartment.unassigned.length > 0 && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 shadow-sm">
          <div className="p-5 border-b border-slate-700/30">
            <h3 className="text-base font-semibold text-slate-200">Unassigned teams</h3>
            <div className="text-sm text-slate-500 mt-1">
              Teams that aren't yet placed in a department.
            </div>
          </div>
          <div className="p-5 pt-4 space-y-2">
            {teamsByDepartment.unassigned.map((team) => {
              const currentOwnerId = selectedOwnerIds[team.id] ?? (team.ownerPersonId ?? "__none__");
              const isSavingOwner = savingOwner[team.id] || false;
              const ownerPerson = people.find(p => p.id === team.ownerPersonId);

              return (
                <div
                  key={team.id}
                  className="rounded-lg border border-slate-700/30 bg-slate-900/20 p-3 hover:border-slate-600/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="text-sm font-medium text-slate-200">
                          {team.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{team.memberCount} {team.memberCount === 1 ? "member" : "members"}</span>
                        {ownerPerson && (
                          <>
                            <span>•</span>
                            <span>Owner: {ownerPerson.fullName}</span>
                          </>
                        )}
                        {canManageStructure && !ownerPerson && (
                          <>
                            <span>•</span>
                            <Select
                              disabled={isSavingOwner}
                              value={currentOwnerId}
                              onValueChange={(v) => handleSetOwner(team.id, v)}
                            >
                              <SelectTrigger className={cn(
                                "border-none bg-transparent p-0 text-xs h-auto text-slate-400",
                                "hover:text-slate-300 focus:ring-0"
                              )}>
                                <SelectValue>
                                  {currentOwnerId === "__none__" ? "No owner" : (people.find(p => p.id === currentOwnerId)?.fullName || "No owner")}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">No owner</SelectItem>
                                {people.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.fullName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/org/structure/teams/${team.id}`}
                      className="text-xs text-slate-400 hover:text-slate-300 hover:underline shrink-0"
                    >
                      View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Optional CTA */}
          <div className="px-5 pb-5 pt-3 border-t border-slate-700/30">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                You can assign teams to departments from the Structure page.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  // Always switch to Teams tab for consistency
                  onTabChange("teams");
                  
                  // Update URL to teams tab (remove filter param since TeamsTab doesn't use it)
                  const currentUrl = new URL(window.location.href);
                  currentUrl.searchParams.set("tab", "teams");
                  currentUrl.searchParams.delete("filter");
                  const targetUrl = currentUrl.pathname + (currentUrl.searchParams.toString() ? "?" + currentUrl.searchParams.toString() : "");
                  
                  // Always update URL (even if same) to ensure state is consistent, then scroll
                  router.push(targetUrl);
                  
                  // Scroll to teams tab section after tab switch renders
                  // Use triple RAF + timeout to ensure DOM is fully updated after tab switch
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      requestAnimationFrame(() => {
                        setTimeout(() => {
                          // Try to find teams section or teams content
                          const teamsSectionEl = document.getElementById("teams-tab-section") || document.getElementById("teams-tab-content");
                          
                          if (teamsSectionEl) {
                            const rect = teamsSectionEl.getBoundingClientRect();
                            // Only scroll if section is not already fully visible at the top
                            if (rect.top > 150 || rect.bottom < window.innerHeight) {
                              const scrollOffset = 150;
                              const scrollY = window.scrollY + rect.top - scrollOffset;
                              window.scrollTo({ top: Math.max(0, scrollY), behavior: "smooth" });
                            } else {
                              // Section already visible - just scroll to top of page for visual feedback
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                          } else {
                            // Fallback: scroll to top of page
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }
                        }, 200); // Delay to allow tab switch to render
                      });
                    });
                  });
                }}
              >
                Manage structure
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Dialog */}
      {editingDepartmentId && (() => {
        const dept = departments.find((d) => d.id === editingDepartmentId);
        return dept ? (
          <EditDepartmentDialog
            department={dept}
            open={!!editingDepartmentId}
            onOpenChange={(open) => {
              if (!open) setEditingDepartmentId(null);
            }}
          />
        ) : null;
      })()}
    </section>
  );
});

const RolesTab = memo(function RolesTab({
  roles,
  canManageStructure,
}: {
  roles: StructureRole[];
  canManageStructure: boolean;
}) {
  if (!roles.length) {
    return (
      <OrgEmptyState
        title="No roles defined"
        description="Roles describe responsibilities and expectations so people know what success looks like. Create a role, then assign it to people."
        primaryAction={
          canManageStructure ? <CreateRoleDialogInlineTrigger /> : undefined
        }
      />
    );
  }

  return (
    <section className="rounded-2xl border border-[#111827] bg-[#020617] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-slate-100">
            Roles <HelpTip text="Roles define responsibilities, skills, and expectations. They help clarify what each person is responsible for and what capabilities they have." />
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Job titles and role definitions used across your organization.
          </p>
        </div>
        {canManageStructure && (
          <CreateRoleDialogInlineTrigger />
        )}
      </div>

      <div className="mt-4 space-y-2">
        {roles.map((role) => (
          <div
            key={role.id}
            className="rounded-xl border border-[#111827] bg-[#020617] p-3 text-xs text-slate-300 transition-colors transition-transform duration-150 hover:-translate-y-[1px] hover:border-slate-600 hover:bg-[#050816]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="font-medium text-slate-100">{role.name}</div>
                {role.level && (
                  <span className="text-[10px] text-slate-500">Level {role.level}</span>
                )}
              </div>
              <span className="text-[11px] text-slate-400">
                {role.activePeopleCount} {role.activePeopleCount === 1 ? "person" : "people"}
              </span>
            </div>
            {role.defaultTeamName && (
              <div className="mt-1 text-[11px] text-slate-500">
                Default team: {role.defaultTeamName}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
});

