/**
 * Structure Page Client Component
 * 
 * PERFORMANCE: Uses startTransition for tab switches to keep UI responsive.
 */

"use client";

import { useState, Suspense, startTransition, useCallback, memo, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { CreateRoleDialogInlineTrigger } from "@/components/org/structure/CreateRoleDialog";
import type {
  StructureTeam,
  StructureDepartment,
  StructureRole,
} from "@/types/org";
import { TeamsDragList } from "@/components/org/structure/TeamsDragList";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { OrgRole } from "@/lib/org/capabilities";

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
  const initialTab = searchParams.get("tab") ?? "teams";
  const highlightTeamId = searchParams.get("teamId");
  const highlightDepartmentId = searchParams.get("departmentId");
  const justCreated = searchParams.get("created");

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const canManageStructure = canRole(role, "manageStructure");

  // PERFORMANCE: Use startTransition to keep UI responsive during tab switches
  const handleTabChange = useCallback((tabId: string) => {
    startTransition(() => {
      setActiveTab(tabId);
    });
  }, []);
  
  // Use hook for real-time updates, but fall back to initial data
  const { teams: hookTeams, departments: hookDepartments, roles: hookRoles, isLoading, error } = useOrgStructureLists();
  const teams = hookTeams ?? initialTeams;
  const departments = hookDepartments ?? initialDepartments;
  const roles = hookRoles ?? initialRoles;
  const noAccess = isOrgNoAccessError(error);

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

      {noAccess ? (
        <OrgNoAccessState />
      ) : (
        <>
          {activeTab === "teams" && (
            <TeamsTab
              teams={teams}
              highlightTeamId={highlightTeamId}
              justCreated={justCreated}
              canManageStructure={canManageStructure}
              departmentOptions={departmentOptions}
              highlightDepartmentId={highlightDepartmentId}
            />
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
            />
          )}

          {activeTab === "roles" && (
            <RolesTab
              roles={roles}
              canManageStructure={canManageStructure}
            />
          )}
        </>
      )}
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
}: {
  teams: StructureTeam[];
  highlightTeamId: string | null;
  justCreated: string | null;
  canManageStructure: boolean;
  departmentOptions: { id: string; name: string }[];
  highlightDepartmentId: string | null;
}) {
  if (!teams.length) {
    return (
      <OrgEmptyState
        title="No teams yet"
        description="Teams group people around clear responsibilities and execution. When you create a new team, it will appear here."
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
    <section className="rounded-2xl border border-[#111827] bg-[#020617] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
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

      <div className="mt-4 space-y-2">
        {teams.map((team) => {
          const highlighted = highlightTeamId === team.id;

          return (
            <div
              key={team.id}
              className={cn(
                "rounded-xl border bg-[#020617] p-3 text-xs text-slate-300 transition-all duration-150 hover:-translate-y-[1px] hover:border-slate-600 hover:bg-[#050816] hover:shadow-sm",
                highlighted ? "border-slate-500" : "border-[#111827]"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-slate-100">{team.name}</div>
                  {justCreated === team.id && (
                    <span className="rounded-full bg-[#5CA9FF]/20 px-2 py-[2px] text-[10px] font-medium text-[#5CA9FF]">
                      New
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">
                  {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-[11px]">
                {team.departmentName && (
                  <span className="text-slate-500">{team.departmentName}</span>
                )}
                <Link
                  href={`/org/people?teamId=${team.id}`}
                  className="text-blue-400 transition-colors hover:text-blue-300 hover:underline"
                >
                  View people
                </Link>
                {canManageStructure && (
                  <Link
                    href={`/org/structure?tab=teams&teamId=${team.id}`}
                    className="text-slate-400 transition-colors hover:text-slate-200 hover:underline"
                  >
                    Edit team
                  </Link>
                )}
              </div>
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
}: {
  departments: StructureDepartment[];
  highlightDepartmentId: string | null;
  justCreated: string | null;
  canManageStructure: boolean;
  teams: StructureTeam[];
  onReorderTeams: (departmentId: string, updates: { id: string; position: number }[]) => Promise<void>;
  topDepartmentsInsights?: Array<{ name: string; headcount: number }> | null;
}) {
  const router = useRouter();

  if (!departments.length) {
    return (
      <OrgEmptyState
        title="No departments yet"
        description="Departments group related teams so everyone understands the high-level structure."
        primaryAction={
          canManageStructure ? <CreateDepartmentDialogInlineTrigger /> : undefined
        }
      />
    );
  }

  return (
    <section className="rounded-2xl border border-[#111827] bg-[#020617] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-slate-100">
            Departments <HelpTip text="Departments are high-level organizational units that group multiple teams. Examples: Engineering, Product, Operations, Sales." />
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Group teams under high-level functions like Engineering, Product, or Operations.
          </p>
        </div>
        {canManageStructure && (
          <CreateDepartmentDialogInlineTrigger />
        )}
      </div>

      {/* Top departments insight (visible to Owner/Admin only) */}
      {topDepartmentsInsights && topDepartmentsInsights.length > 0 && (
        <div className="mb-4 rounded-2xl border border-slate-800 bg-[#020617] px-4 py-3 text-[11px] text-slate-300">
          <div className="mb-1 text-[12px] font-semibold text-slate-100">
            Top departments by headcount
          </div>
          <ul className="space-y-1">
            {topDepartmentsInsights.map((d) => (
              <li key={d.name} className="flex items-center justify-between">
                <span>{d.name}</span>
                <span className="text-slate-400">{d.headcount}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 space-y-4">
        {departments.map((d) => {
          const highlighted = highlightDepartmentId === d.id;
          const deptTeams = teams.filter((t) => t.departmentId === d.id);

          return (
            <div
              key={d.id}
              className={cn(
                "rounded-xl border bg-[#020617] p-4 text-xs text-slate-300 transition-all duration-150 hover:-translate-y-[1px] hover:border-slate-600 hover:bg-[#050816] hover:shadow-sm",
                highlighted ? "border-slate-500" : "border-[#111827]"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-slate-100">{d.name}</div>
                  {justCreated === d.id && (
                    <span className="rounded-full bg-[#5CA9FF]/20 px-2 py-[2px] text-[10px] font-medium text-[#5CA9FF]">
                      New
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">
                  {d.teamCount} {d.teamCount === 1 ? "team" : "teams"}
                </span>
              </div>

              {deptTeams.length > 0 && canManageStructure ? (
                <TeamsDragList
                  departmentId={d.id}
                  teams={deptTeams}
                  onReorder={(updates) => onReorderTeams(d.id, updates)}
                />
              ) : deptTeams.length > 0 ? (
                <div className="ml-2 space-y-1">
                  {deptTeams.map((team) => (
                    <div key={team.id} className="text-[12px] text-slate-400">
                      • {team.name} ({team.memberCount} {team.memberCount === 1 ? "member" : "members"})
                    </div>
                  ))}
                </div>
              ) : (
                <p className="ml-2 text-[11px] text-slate-500">No teams yet</p>
              )}

              <div className="mt-3 flex items-center gap-3 text-[11px]">
                <Link
                  href={`/org/structure?tab=teams&departmentId=${d.id}`}
                  className="text-blue-400 transition-colors hover:text-blue-300 hover:underline"
                >
                  View teams
                </Link>
                <Link
                  href={`/org/people?departmentId=${d.id}`}
                  className="text-slate-400 transition-colors hover:text-slate-200 hover:underline"
                >
                  View people
                </Link>
                {canManageStructure && (
                  <Link
                    href={`/org/structure?tab=departments&departmentId=${d.id}`}
                    className="text-slate-400 transition-colors hover:text-slate-200 hover:underline"
                  >
                    Edit department
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
        description="Roles describe responsibilities and expectations so people know what success looks like. Learn more about custom roles in Org Settings."
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

