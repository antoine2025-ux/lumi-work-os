"use client";

import { useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgDepartmentRow } from "@/components/org/OrgDepartmentRow";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { OrgNoAccessState } from "@/components/org/OrgNoAccessState";
import { OrgChartFilters, type OrgChartFilter } from "@/components/org/OrgChartFilters";
import { OrgChartEmptyState } from "@/components/org/OrgChartEmptyState";
import { getInitials } from "@/components/org/structure/utils";

type OrgChartClientProps = {
  orgId: string;
  chartData: {
    departments: Array<{
      id: string;
      name: string;
      leadName: string | null;
      leadId: string | null;
      teams: Array<{
        id: string;
        name: string;
        leadName: string | null;
        headcount: number;
      }>;
    }>;
  } | null;
};

type DepartmentRowData = {
  id: string;
  name: string;
  leaderName: string | null;
  leaderInitials: string | undefined;
  reportsToName?: string;
  teamsCount: number;
  peopleCount: number;
  isHiring?: boolean;
  recentChangeSummary?: string;
  isReorg?: boolean;
  accentIndex: number;
};

/**
 * Normalize department data for OrgDepartmentRow component
 */
function normalizeOrgForOrgChart(
  departments: OrgChartClientProps["chartData"]["departments"],
  baseIndex: number = 0
): DepartmentRowData[] {
  if (!departments) return [];

  return departments.map((dept, index) => {
    const teamsCount = dept.teams.length;
    const peopleCount = dept.teams.reduce(
      (sum, team) => sum + team.headcount,
      0
    );

    return {
      id: dept.id,
      name: dept.name,
      leaderName: dept.leadName,
      leaderInitials: dept.leadName ? getInitials(dept.leadName) : undefined,
      reportsToName: undefined, // TODO: Populate from department hierarchy when available
      teamsCount,
      peopleCount,
      isHiring: false, // TODO: Determine from recent job postings or positions
      recentChangeSummary: undefined, // TODO: Calculate from recent changes
      isReorg: false, // TODO: Determine from recent structural changes
      accentIndex: baseIndex + index,
    };
  });
}

export function OrgChartClient({ orgId, chartData }: OrgChartClientProps) {
  const isLoading = !chartData;
  const noAccess = false; // Permission checked server-side
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<OrgChartFilter>("all");
  const [error, setError] = useState<Error | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize department data into view model
  const departments = useMemo<DepartmentRowData[]>(
    () => normalizeOrgForOrgChart(chartData?.departments ?? null),
    [chartData]
  );

  // Compute org-level summary counts
  const summary = useMemo(() => {
    if (!departments.length) {
      return { departmentCount: 0, teamCount: 0, peopleCount: 0 };
    }

    return {
      departmentCount: departments.length,
      teamCount: departments.reduce((sum, dept) => sum + dept.teamsCount, 0),
      peopleCount: departments.reduce((sum, dept) => sum + dept.peopleCount, 0),
    };
  }, [departments]);

  // Filter departments based on search and filter criteria
  const visibleDepartments = useMemo(() => {
    return departments
      // Text search
      .filter((dept) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          dept.name.toLowerCase().includes(q) ||
          (dept.leaderName && dept.leaderName.toLowerCase().includes(q))
        );
      })
      // Pill filters
      .filter((dept) => {
        switch (activeFilter) {
          case "hiring":
            return Boolean(dept.isHiring);
          case "large":
            return dept.peopleCount > 10;
          case "recent":
            return Boolean(dept.recentChangeSummary);
          case "all":
          default:
            return true;
        }
      });
  }, [departments, query, activeFilter]);

  // Navigation handlers
  const handleOpenStructure = (deptId: string) => {
    router.push(`/org/structure?department=${deptId}`);
  };

  const handleViewPeople = (deptId: string) => {
    router.push(`/org/people?departmentId=${deptId}`);
  };

  const handleRefetch = () => {
    setError(null);
    // Trigger a page refresh or refetch
    window.location.reload();
  };

  const handleClearFilters = () => {
    setQuery("");
    setActiveFilter("all");
    // Optionally refocus the search field
    searchInputRef.current?.focus();
  };

  return (
    <>
      <OrgPageHeader
        breadcrumb="ORG / ORG CHART"
        title="Org chart"
        description="See how departments connect across your organization."
      />

      <div className="px-10 pb-10">
        {isLoading && (!chartData || departments.length === 0) ? (
          <div className="mt-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-24 w-full animate-pulse rounded-3xl bg-slate-900/60"
              />
            ))}
          </div>
        ) : noAccess ? (
          <OrgNoAccessState />
        ) : chartData ? (
          <>
            {/* Query bar: Search + Filters - consistent placement under header */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              {/* Left: Search */}
              <div className="flex-1 max-w-xl">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search departments or leaders…"
                    className="w-full rounded-full border border-white/10 bg-slate-900/60 px-4 py-2 pl-9 text-sm text-white/90 placeholder:text-white/40 transition-all duration-200 focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/60"
                  />
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/40">
                    🔍
                  </span>
                </div>
              </div>

              {/* Right: Filters */}
              <OrgChartFilters
                activeFilter={activeFilter}
                onChange={setActiveFilter}
              />
            </div>

            {/* Error banner */}
            {error && (
              <div className="mt-4 flex items-center justify-between rounded-3xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                <span>We couldn't load your org chart. Please try again.</span>
                <button
                  type="button"
                  onClick={handleRefetch}
                  className="rounded-full bg-red-500/20 px-3 py-1 text-[11px] font-medium transition-all duration-200 hover:bg-red-500/30 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 focus-visible:ring-offset-2"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty state for no departments (no data at all) */}
            {!isLoading && departments.length === 0 && !error && (
              <OrgEmptyState
                title="No org chart yet"
                description="We couldn't build an org chart because there's not enough structure. Add departments, teams, and people to see your organization laid out visually."
                primaryActionLabel="Set up structure"
                primaryActionHref="/org/structure"
              />
            )}

            {/* Department rows list or empty state */}
            {!isLoading && departments.length > 0 && (
              <div className="mt-8 space-y-4">
                {visibleDepartments.length === 0 ? (
                  <OrgChartEmptyState
                    activeFilter={activeFilter}
                    searchQuery={query}
                    onClearFilters={handleClearFilters}
                  />
                ) : (
                  visibleDepartments.map((dept) => (
                    <OrgDepartmentRow
                      key={dept.id}
                      id={dept.id}
                      name={dept.name}
                      leaderName={dept.leaderName}
                      leaderInitials={dept.leaderInitials}
                      leaderRole="Department lead"
                      reportsToName={dept.reportsToName}
                      teamsCount={dept.teamsCount}
                      peopleCount={dept.peopleCount}
                      isHiring={dept.isHiring}
                      recentChangeSummary={dept.recentChangeSummary}
                      isReorg={dept.isReorg}
                      onOpenStructure={handleOpenStructure}
                      onViewPeople={handleViewPeople}
                      accentIndex={dept.accentIndex}
                    />
                  ))
                )}
              </div>
            )}
          </>
        ) : (
          <OrgEmptyState
            title="No org chart yet"
            description="We couldn't build an org chart because there's not enough structure. Add departments, teams, and people to see your organization laid out visually."
            primaryActionLabel="Set up structure"
            primaryActionHref="/org/structure"
          />
        )}
      </div>
    </>
  );
}

