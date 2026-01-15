"use client";

import { OrgChartData, OrgChartDepartment, OrgChartTeam } from "@/hooks/useOrgChartData";
import { OrgEmptyState } from "./OrgEmptyState";

type OrgChartTreeProps = {
  orgName: string;
  data: OrgChartData;
};

/**
 * Simple, non-interactive Org chart tree.
 *
 * - Top: org node
 * - Next: departments
 * - Then: teams as cards
 *
 * This is intentionally calm and readable, with minimal lines and no
 * interactive controls yet.
 */
export function OrgChartTree({ orgName, data }: OrgChartTreeProps) {
  const hasDepartments = data.departments.length > 0;

  if (!hasDepartments) {
    return (
      <OrgEmptyState
        title="No structure defined yet"
        description="This org does not have any departments or teams set up. Once you create departments and teams, the hierarchy will appear here as an Org chart."
        primaryActionLabel="Go to Org structure"
        primaryActionHref="/org/structure"
        className="border border-[#111827]"
      />
    );
  }

  return (
    <div className="rounded-2xl border border-[#111827] bg-[#020617] p-4 text-sm text-slate-300">
      {/* Org root node */}
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-full border border-[#1e293b] bg-[#020617] px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-300">
          Organization
        </div>
        <div className="rounded-2xl border border-[#1e293b] bg-[#020617] px-4 py-2 text-sm font-semibold text-slate-100 shadow-sm">
          {orgName}
        </div>
      </div>

      {/* Connector down */}
      <div className="mx-auto my-4 h-6 w-px bg-[#1e293b]" />

      {/* Departments row */}
      <div className="flex flex-wrap justify-center gap-6">
        {data.departments.map((dept) => (
          <OrgChartDepartmentNode key={dept.id} department={dept} />
        ))}
      </div>
    </div>
  );
}

type OrgChartDepartmentNodeProps = {
  department: OrgChartDepartment;
};

function OrgChartDepartmentNode({ department }: OrgChartDepartmentNodeProps) {
  const hasTeams = department.teams.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Department node */}
      <div className="rounded-xl border border-[#1e293b] bg-[#020617] px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-200">
        {department.name}
      </div>

      {/* Connector down */}
      {hasTeams && (
        <div className="my-3 h-5 w-px bg-[#1e293b]" />
      )}

      {/* Teams row */}
      {hasTeams && (
        <div className="flex flex-wrap justify-center gap-3">
          {department.teams.map((team) => (
            <OrgChartTeamNode key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}

type OrgChartTeamNodeProps = {
  team: OrgChartTeam;
};

function OrgChartTeamNode({ team }: OrgChartTeamNodeProps) {
  return (
    <div className="w-56 rounded-xl border border-[#111827] bg-[#020617] p-3 text-xs text-slate-200 shadow-sm">
      <div className="text-[13px] font-medium text-slate-100">
        {team.name}
      </div>
      <div className="mt-1 text-[11px] text-slate-400">
        {team.leadName ? (
          <>
            Lead: <span className="text-slate-200">{team.leadName}</span>
          </>
        ) : (
          <span className="italic text-slate-500">No lead assigned</span>
        )}
      </div>
      <div className="mt-1 text-[11px] text-slate-400">
        Headcount: <span className="text-slate-200">{team.headcount}</span>
      </div>
    </div>
  );
}

