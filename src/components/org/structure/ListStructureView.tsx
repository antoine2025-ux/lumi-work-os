"use client";

import { useState } from "react";
import { Building, ChevronDown, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import type { StructureDepartment, StructureTeam } from "@/types/org";
import { getInitials } from "./utils";

type ListStructureViewProps = {
  departments: StructureDepartment[];
  teams: StructureTeam[] | null;
};

/**
 * List View - Existing department cards layout
 * Extracted from OrgStructureSection for view mode switching
 */
export function ListStructureView({ departments, teams }: ListStructureViewProps) {
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());

  const toggleDepartment = (deptId: string) => {
    setExpandedDepartments((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) {
        next.delete(deptId);
      } else {
        next.add(deptId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {departments.map((dept) => {
        const deptTeams = teams?.filter((t) => t.departmentId === dept.id) ?? [];
        const isExpanded = expandedDepartments.has(dept.id);
        const hasTeams = deptTeams.length > 0;
        const totalPeople = deptTeams.reduce((sum, team) => sum + team.memberCount, 0);

        return (
          <div
            key={dept.id}
            className={`relative flex flex-col rounded-2xl border transition-all duration-200 ${
              isExpanded
                ? "border-blue-500/50 bg-gradient-to-b from-slate-900/80 to-slate-950/60 shadow-xl shadow-blue-500/10"
                : "border-slate-800/50 bg-gradient-to-b from-[#020617] to-slate-950/80 hover:-translate-y-[1px] hover:border-slate-700/60 hover:shadow-md hover:shadow-slate-900/50"
            }`}
          >
            {/* Department header - clickable to expand/collapse */}
            <button
              type="button"
              onClick={() => toggleDepartment(dept.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleDepartment(dept.id);
                }
              }}
              className={`group w-full flex items-center justify-between text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded-t-2xl cursor-pointer ${
                isExpanded ? "p-6 md:p-7" : "p-5 md:p-6 hover:bg-white/5"
              }`}
              aria-expanded={isExpanded}
              aria-controls={`dept-teams-${dept.id}`}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Department icon */}
                <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center">
                  <Building className="h-4.5 w-4.5 text-blue-400" />
                </div>
                
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Primary: Department name */}
                  <span className="text-xl font-semibold text-slate-100">
                    {dept.name}
                  </span>
                  
                  {/* Secondary: Chips */}
                  {hasTeams && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-full bg-slate-800/80 backdrop-blur-sm border border-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-300">
                        {deptTeams.length} {deptTeams.length === 1 ? "team" : "teams"}
                      </span>
                      {totalPeople > 0 && (
                        <span className="inline-flex items-center rounded-full bg-slate-800/80 backdrop-blur-sm border border-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-300">
                          {totalPeople} {totalPeople === 1 ? "person" : "people"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Expand/collapse chevron */}
              {hasTeams && (
                <div className={`flex-shrink-0 ml-4 inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                  isExpanded 
                    ? "bg-slate-800/50" 
                    : "group-hover:bg-slate-800/50 group-hover:ring-1 group-hover:ring-blue-500/30"
                }`}>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transform transition-transform duration-200 ${
                      isExpanded ? "rotate-180 text-blue-400" : "rotate-0 group-hover:text-slate-300"
                    }`}
                  />
                </div>
              )}
            </button>

            {/* Teams grid - collapsible with smooth animation */}
            {hasTeams && (
              <div
                id={`dept-teams-${dept.id}`}
                className={`overflow-hidden transition-all duration-200 ease-in-out ${
                  isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-6 md:px-7 pb-6 md:pb-7 border-t border-slate-800/60 bg-slate-950/40 pt-5">
                  <div className="mb-5">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                      Teams
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {deptTeams.map((team) => (
                      <TeamMiniCard key={team.id} team={team} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!hasTeams && (
              <div className="px-5 md:px-6 pb-5 md:pb-6 pt-2">
                <p className="text-sm text-slate-500">No teams yet</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Team mini-card component for List View
 */
type TeamMiniCardProps = {
  team: StructureTeam;
};

function TeamMiniCard({ team }: TeamMiniCardProps) {
  const router = useRouter();

  const handleOpenTeam = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/org/structure?tab=teams&teamId=${team.id}`);
  };

  return (
    <div className="group flex flex-col rounded-2xl border border-slate-800/60 bg-slate-900/40 px-4 py-4 transition-all duration-150 hover:-translate-y-[1px] hover:border-slate-700/70 hover:bg-slate-900/60 hover:shadow-lg">
      {/* Top row: Team name (primary) + headcount pill (aligned right) */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="text-base font-medium text-slate-200 flex-1 min-w-0">
          {team.name}
        </h4>
        <span className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-300 flex-shrink-0">
          {team.memberCount} {team.memberCount === 1 ? "person" : "people"}
        </span>
      </div>

      {/* Second row: Lead info (only if lead exists) */}
      {team.leadName && (
        <div className="flex items-center gap-2.5 mb-3">
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarFallback className="bg-slate-700/50 border border-slate-600/50 text-xs text-slate-300">
              {getInitials(team.leadName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col leading-tight min-w-0 flex-1">
            <span className="text-xs text-slate-500 uppercase tracking-wide">Lead</span>
            <span className="text-sm font-medium text-slate-300 truncate">
              {team.leadName}
            </span>
          </div>
        </div>
      )}

      {/* Bottom: Open button (primary affordance) */}
      <div className="mt-auto pt-2">
        <button
          type="button"
          onClick={handleOpenTeam}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded px-2 py-1 hover:bg-blue-500/10 whitespace-nowrap group-hover:gap-2"
        >
          Open
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

