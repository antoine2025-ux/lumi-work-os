"use client";

import { useMemo, useCallback } from "react";
import { AlertTriangle, Users, UserCheck, UserX, TrendingUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MiniBarList } from "./MiniBarList";
import { QuickQuestionChips } from "./QuickQuestionChips";
import type { OrgPerson } from "@/types/org";
import type { PeopleFilters } from "./people-filters";

type PeopleInsightsPanelProps = {
  people: OrgPerson[];
  filters: PeopleFilters;
  onFiltersChange: (filters: Partial<PeopleFilters>) => void;
  onScrollToTop?: () => void;
};

type PeopleMetrics = {
  total: number;
  managersCount: number | null;
  unassignedCount: number;
  newJoinersCount: number | null;
  headcountByDepartment: Array<{ label: string; value: number }>;
  headcountByTeam: Array<{ label: string; value: number }>;
  departmentsWithNoLeader: string[];
  teamsWithZeroMembers: string[];
  peopleMissingData: {
    role: number;
    team: number;
    department: number;
  };
  managersWithLargeSpan: Array<{ managerId: string; managerName: string; count: number }>;
};

function deriveMetrics(people: OrgPerson[]): PeopleMetrics {
  const total = people.length;

  // Managers count - derive from managerId references or directReports
  let managersCount: number | null = null;
  const managerIds = new Set<string>();
  people.forEach((person) => {
    // If we had managerId field, we'd check person.managerId
    // For now, we'll try to infer from role keywords
    const role = person.role?.toLowerCase() || "";
    if (
      role.includes("lead") ||
      role.includes("manager") ||
      role.includes("director") ||
      role.includes("head") ||
      role.includes("chief")
    ) {
      managerIds.add(person.id);
    }
  });
  if (managerIds.size > 0) {
    managersCount = managerIds.size;
  }

  // Unassigned count
  const unassignedCount = people.filter(
    (p) => !p.teamId && !p.departmentId
  ).length;

  // New joiners (last 30 days)
  let newJoinersCount: number | null = null;
  if (people.some((p) => p.joinedAt)) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    newJoinersCount = people.filter((p) => {
      if (!p.joinedAt) return false;
      const joinedDate = new Date(p.joinedAt);
      return joinedDate >= thirtyDaysAgo;
    }).length;
  }

  // Headcount by department
  const deptMap = new Map<string, number>();
  people.forEach((p) => {
    if (p.department) {
      deptMap.set(p.department, (deptMap.get(p.department) || 0) + 1);
    }
  });
  const headcountByDepartment = Array.from(deptMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // Headcount by team
  const teamMap = new Map<string, number>();
  people.forEach((p) => {
    if (p.team) {
      teamMap.set(p.team, (teamMap.get(p.team) || 0) + 1);
    }
  });
  const headcountByTeam = Array.from(teamMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // Departments with no leader (if we had leader data)
  const departmentsWithNoLeader: string[] = [];
  // TODO: Implement when leader data is available

  // Teams with zero members
  const teamsWithZeroMembers: string[] = [];
  // TODO: Implement when we can cross-reference with all teams

  // People missing data
  const peopleMissingData = {
    role: people.filter((p) => !p.role).length,
    team: people.filter((p) => !p.teamId).length,
    department: people.filter((p) => !p.departmentId).length,
  };

  // Managers with large span of control (> 10 direct reports)
  const managersWithLargeSpan: Array<{ managerId: string; managerName: string; count: number }> = [];
  // TODO: Implement when managerId/directReports data is available

  return {
    total,
    managersCount,
    unassignedCount,
    newJoinersCount,
    headcountByDepartment,
    headcountByTeam,
    departmentsWithNoLeader,
    teamsWithZeroMembers,
    peopleMissingData,
    managersWithLargeSpan,
  };
}

/**
 * People Insights Panel
 * Shows metrics, distributions, flags, and quick question shortcuts
 * Desktop: sticky side panel
 */
export function PeopleInsightsPanel({
  people,
  filters,
  onFiltersChange,
  onScrollToTop,
}: PeopleInsightsPanelProps) {
  const metrics = useMemo(() => deriveMetrics(people), [people]);

  const handleQuickQuestion = useCallback((questionId: string) => {
    switch (questionId) {
      case "unassigned":
        onFiltersChange({ quickChip: "unassigned" });
        break;
      case "managers":
        onFiltersChange({ quickChip: "leaders", leadersOnly: true });
        break;
      case "new-joiners":
        // TODO: When new joiners filter is available
        break;
      case "largest-departments":
        // Sort by department headcount (would need custom sort)
        onFiltersChange({ sort: "name", direction: "asc" });
        break;
      case "recently-changed":
        onFiltersChange({ recentlyChanged: true });
        break;
    }
    onScrollToTop?.();
  }, [onFiltersChange, onScrollToTop]);

  const quickQuestions = useMemo(() => {
    const questions = [
      {
        id: "unassigned",
        label: "Show unassigned",
      },
      {
        id: "managers",
        label: "Show managers",
      },
      {
        id: "largest-departments",
        label: "Largest departments",
      },
    ];

    if (metrics.newJoinersCount !== null) {
      questions.push({
        id: "new-joiners",
        label: "Show new joiners",
      });
    }

    // Add recently changed if supported
    questions.push({
      id: "recently-changed",
      label: "Recently changed",
    });

    return questions.map((q) => ({
      ...q,
      onClick: () => handleQuickQuestion(q.id),
    }));
  }, [metrics.newJoinersCount, handleQuickQuestion]);

  return (
    <div
      className={cn(
        "w-full lg:w-72",
        "rounded-3xl",
        "bg-slate-900/50",
        "border border-white/3",
        "shadow-[0_12px_50px_rgba(0,0,0,0.2)]",
        "p-6",
        "space-y-6",
        "sticky top-24",
        "max-h-[calc(100vh-8rem)]",
        "overflow-y-auto"
      )}
    >
      {/* Org health snapshot - de-emphasized */}
      <div className="space-y-3">
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            Org health snapshot
          </h3>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-600" />
              <span className="text-xs text-slate-500">Total visible</span>
            </div>
            <span className="text-sm font-semibold text-slate-300 tabular-nums">
              {metrics.total}
            </span>
          </div>

          {metrics.managersCount !== null && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-slate-600" />
                <span className="text-xs text-slate-500">Managers</span>
              </div>
              <span className="text-sm font-semibold text-slate-300 tabular-nums">
                {metrics.managersCount}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-slate-600" />
              <span className="text-xs text-slate-500">Unassigned</span>
            </div>
            <span className="text-sm font-semibold text-slate-300 tabular-nums">
              {metrics.unassignedCount}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-600" />
              <span className="text-xs text-slate-500">New (30d)</span>
            </div>
            {metrics.newJoinersCount !== null ? (
              <span className="text-sm font-semibold text-slate-300 tabular-nums">
                {metrics.newJoinersCount}
              </span>
            ) : (
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-500">—</span>
                <span className="text-[10px] text-slate-600">Start dates not set</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Distribution - visually separated, de-emphasized */}
      <div className="space-y-3 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            Distribution
          </h3>
          <Link
            href="/org/org-chart"
            className={cn(
              "inline-flex items-center gap-1",
              "text-[10px] text-slate-400 hover:text-slate-300",
              "transition-colors duration-150"
            )}
          >
            <span>Open Org Chart</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-3">
          {metrics.headcountByDepartment.length > 0 && (
            <div>
              <h4 className="text-[11px] font-medium text-slate-400 mb-1.5">Top Departments</h4>
              <MiniBarList items={metrics.headcountByDepartment} maxItems={5} />
            </div>
          )}

          {metrics.headcountByTeam.length > 0 && (
            <div>
              <h4 className="text-[11px] font-medium text-slate-400 mb-1.5">Top Teams</h4>
              <MiniBarList items={metrics.headcountByTeam} maxItems={5} />
            </div>
          )}
        </div>
      </div>

      {/* Flags & Anomalies - Primary visual element, visually separated */}
      {(metrics.departmentsWithNoLeader.length > 0 ||
        metrics.teamsWithZeroMembers.length > 0 ||
        metrics.peopleMissingData.role > 0 ||
        metrics.peopleMissingData.team > 0 ||
        metrics.peopleMissingData.department > 0 ||
        metrics.managersWithLargeSpan.length > 0) && (
        <div className="space-y-3 pt-4 border-t border-white/5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Flags & Anomalies
          </h3>
          <div className="space-y-2.5">
            {metrics.peopleMissingData.role > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs text-slate-300">
                    {metrics.peopleMissingData.role} missing role
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Filter to show people without roles
                    onFiltersChange({ unassignedOnly: true });
                    onScrollToTop?.();
                  }}
                  className="text-xs font-medium text-amber-400 hover:text-amber-300 underline"
                >
                  Fix
                </button>
              </div>
            )}

            {metrics.peopleMissingData.team > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs text-slate-300">
                    {metrics.peopleMissingData.team} missing team
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onFiltersChange({ quickChip: "unassigned" });
                    onScrollToTop?.();
                  }}
                  className="text-xs font-medium text-amber-400 hover:text-amber-300 underline"
                >
                  Fix
                </button>
              </div>
            )}

            {metrics.peopleMissingData.department > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs text-slate-300">
                    {metrics.peopleMissingData.department} missing department
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onFiltersChange({ quickChip: "unassigned" });
                    onScrollToTop?.();
                  }}
                  className="text-xs font-medium text-amber-400 hover:text-amber-300 underline"
                >
                  Fix
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Questions */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Quick Questions
        </h3>
        <QuickQuestionChips questions={quickQuestions} />
      </div>
    </div>
  );
}

