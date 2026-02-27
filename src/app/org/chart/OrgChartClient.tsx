"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OrgDepartmentRow } from "@/components/org/OrgDepartmentRow";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { OrgNoAccessState } from "@/components/org/OrgNoAccessState";
import { OrgChartFilters, type OrgChartFilter } from "@/components/org/OrgChartFilters";
import { OrgChartEmptyState } from "@/components/org/OrgChartEmptyState";
import { OrgChartTreeView } from "@/components/org/OrgChartTreeView";
import { getInitials } from "@/components/org/structure/utils";
import type { OrgChartTree } from "@/lib/org/projections/buildOrgChartTree";

type OrgChartClientProps = {
  orgId: string;
  chartData: {
    departments: Array<{
      id: string;
      name: string;
      leadName: string | null;
      leadId: string | null;
      reportsToName: string | null;
      isHiring: boolean;
      recentChangeSummary: string | undefined;
      isReorg: boolean;
      teams: Array<{
        id: string;
        name: string;
        leadName: string | null;
        headcount: number;
      }>;
    }>;
  } | null;
  chartTree?: OrgChartTree | null;
  validation?: { totals?: { cycleMembers?: number; invalidManagerEdges?: number } } | null;
};

type ViewMode = "flat" | "tree";

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

type ChartDepartment = NonNullable<OrgChartClientProps["chartData"]>["departments"][number];

/**
 * Normalize department data for OrgDepartmentRow component
 */
function normalizeOrgForOrgChart(
  departments: ChartDepartment[] | null | undefined,
  baseIndex: number = 0
): DepartmentRowData[] {
  if (!departments) return [];

  return departments.map((dept: ChartDepartment, index: number) => {
    const teamsCount = dept.teams.length;
    const peopleCount = dept.teams.reduce(
      (sum: number, team: { headcount: number }) => sum + team.headcount,
      0
    );

    return {
      id: dept.id,
      name: dept.name,
      leaderName: dept.leadName,
      leaderInitials: dept.leadName ? getInitials(dept.leadName) : undefined,
      reportsToName: dept.reportsToName ?? undefined,
      teamsCount,
      peopleCount,
      isHiring: dept.isHiring,
      recentChangeSummary: dept.recentChangeSummary,
      isReorg: dept.isReorg,
      accentIndex: baseIndex + index,
    };
  });
}

export function OrgChartClient({ orgId: _orgId, chartData, chartTree, validation }: OrgChartClientProps) {
  const isLoading = !chartData;
  const noAccess = false; // Permission checked server-side
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<OrgChartFilter>("all");
  const [error, setError] = useState<Error | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("flat");

  // Load view preference from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem("orgChartViewMode");
    if (savedView === "tree" || savedView === "flat") {
      setViewMode(savedView);
    }
  }, []);

  // Save view preference to localStorage
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("orgChartViewMode", mode);
  };

  // Normalize department data into view model
  const departments = useMemo<DepartmentRowData[]>(
    () => normalizeOrgForOrgChart(chartData?.departments ?? null),
    [chartData]
  );

  // Compute org-level summary counts
  const _summary = useMemo(() => {
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
      <div>
        {/* Structure Integrity Banner */}
        {validation && <IntegrityBanner validation={validation} />}

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
            {/* Query bar: Search + Filters + View Toggle */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              {/* Left: Search (only in flat view) */}
              {viewMode === "flat" && (
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
              )}

              {/* Spacer for tree view */}
              {viewMode === "tree" && <div className="flex-1" />}

              {/* View Toggle */}
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 p-1">
                <button
                  onClick={() => handleViewModeChange("flat")}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                    viewMode === "flat"
                      ? "bg-primary text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  List View
                </button>
                <button
                  onClick={() => handleViewModeChange("tree")}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                    viewMode === "tree"
                      ? "bg-primary text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                  disabled={!chartTree}
                >
                  Tree View
                </button>
              </div>

              {/* Right: Filters (only in flat view) */}
              {viewMode === "flat" && (
                <OrgChartFilters
                  activeFilter={activeFilter}
                  onChange={setActiveFilter}
                />
              )}
            </div>

            {/* Error banner */}
            {error && (
              <div className="mt-4 flex items-center justify-between rounded-3xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                <span>We couldn&apos;t load your org chart. Please try again.</span>
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

            {/* View-specific content */}
            {!isLoading && departments.length > 0 && (
              <>
                {viewMode === "flat" ? (
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
                ) : (
                  <div className="mt-8">
                    {chartTree ? (
                      <OrgChartTreeView
                        tree={chartTree}
                        onNodeClick={(node) => {
                          if (node.personId) {
                            router.push(`/org/people/${node.personId}`);
                          }
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-[500px] text-slate-400">
                        Tree view is not available
                      </div>
                    )}
                  </div>
                )}
              </>
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

// Remove unused imports if OrgPageHeader is no longer needed

function IntegrityBanner(props: { validation: { totals?: { cycleMembers?: number; invalidManagerEdges?: number } } | null }) {
  const v = props.validation;
  const cycles = v?.totals?.cycleMembers || 0;
  const invalid = v?.totals?.invalidManagerEdges || 0;

  if (cycles === 0 && invalid === 0) return null;

  const messageParts = [];
  if (invalid > 0) messageParts.push(`${invalid} invalid manager references`);
  if (cycles > 0) messageParts.push(`${cycles} cycle members`);
  const message = messageParts.join(" · ");

  return (
    <div className="mb-6 rounded-2xl border border-amber-400/40 bg-amber-50/60 p-4 dark:border-amber-300/30 dark:bg-amber-900/20">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-medium text-black/80 dark:text-white/80">Structure integrity warning</div>
          <div className="mt-1 text-sm text-black/60 dark:text-white/60">
            Org Chart may be incomplete or misleading: {message}.
          </div>
        </div>

        <Link
          href="/org/people?mode=fix&focus=validation"
          className="inline-flex items-center justify-center rounded-xl bg-black px-3 py-2 text-sm text-white hover:opacity-90 dark:bg-white dark:text-black"
        >
          Repair in People →
        </Link>
      </div>

      <div className="mt-2 text-xs text-black/50 dark:text-white/50">
        Tip: Use People → Structure validation → Repair cycles / Repair orphans, then return here.
      </div>
    </div>
  );
}

