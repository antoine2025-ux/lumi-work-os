"use client";

import Link from "next/link";
import type { OrgOverviewStats } from "@/lib/org/data.server";
import type { OrgInsightsSnapshot } from "@/lib/org/insights";

type OrgOverviewStatsRibbonProps = {
  stats: OrgOverviewStats | null;
  insightsSnapshot?: OrgInsightsSnapshot | null;
  canViewInsights?: boolean;
  loading?: boolean;
};

/**
 * Unified metrics ribbon for Org Overview page.
 * Combines stats and insights into a single, premium-feeling metrics display.
 */
export function OrgOverviewStatsRibbon({
  stats,
  insightsSnapshot,
  canViewInsights = false,
  loading = false,
}: OrgOverviewStatsRibbonProps) {
  // Determine which data source to use (prefer insights if available, fallback to stats)
  const peopleCount = insightsSnapshot?.summary.totalPeople ?? stats?.peopleCount ?? 0;
  const teamCount = insightsSnapshot?.summary.totalTeams ?? stats?.teamCount ?? 0;
  const departmentCount = insightsSnapshot?.summary.totalDepartments ?? stats?.departmentCount ?? 0;
  const roleCount = insightsSnapshot?.summary.totalRoles ?? 0;

  const hasData = peopleCount > 0 || teamCount > 0 || departmentCount > 0 || roleCount > 0;
  const showViewAllLink = canViewInsights && hasData;

  return (
    <section className="rounded-2xl border border-border/50 bg-white/5 px-6 py-5">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[12px] font-semibold text-foreground">
            Org insights
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            At-a-glance metrics for this organization.
          </p>
        </div>
        {showViewAllLink && (
          <Link
            href="/org/insights"
            className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded"
          >
            View all →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* People */}
        <div className="rounded-xl border border-border/50 bg-background/50 p-4 text-sm text-foreground transition-all duration-150 hover:border-border/50 hover:bg-background hover:shadow-sm">
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            People
          </div>
          <div className="mt-2 text-3xl font-semibold text-foreground">
            {loading ? "–" : peopleCount.toString()}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Current members in this org
          </div>
        </div>

        {/* Teams */}
        <div className="rounded-xl border border-border/50 bg-background/50 p-4 text-sm text-foreground transition-all duration-150 hover:border-border/50 hover:bg-background hover:shadow-sm">
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Teams
          </div>
          <div className="mt-2 text-3xl font-semibold text-foreground">
            {loading ? "–" : teamCount.toString()}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Active teams
          </div>
        </div>

        {/* Departments */}
        <div className="rounded-xl border border-border/50 bg-background/50 p-4 text-sm text-foreground transition-all duration-150 hover:border-border/50 hover:bg-background hover:shadow-sm">
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Departments
          </div>
          <div className="mt-2 text-3xl font-semibold text-foreground">
            {loading ? "–" : departmentCount.toString()}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Active departments
          </div>
        </div>

        {/* Roles */}
        <div className="rounded-xl border border-border/50 bg-background/50 p-4 text-sm text-foreground transition-all duration-150 hover:border-border/50 hover:bg-background hover:shadow-sm">
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Roles
          </div>
          <div className="mt-2 text-3xl font-semibold text-foreground">
            {loading ? "–" : roleCount.toString()}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Active roles
          </div>
        </div>
      </div>
    </section>
  );
}

