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
  const openInvitesCount = stats?.openInvitesCount ?? 0;

  const hasData = peopleCount > 0 || teamCount > 0 || departmentCount > 0 || roleCount > 0;
  const showViewAllLink = canViewInsights && hasData;

  return (
    <section className="rounded-2xl border border-slate-800/50 bg-white/5 px-6 py-5">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[12px] font-semibold text-slate-100">
            Org insights
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            At-a-glance metrics for this organization.
          </p>
        </div>
        {showViewAllLink && (
          <Link
            href="/org/insights"
            className="text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded"
          >
            View all →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* People */}
        <div className="rounded-xl border border-slate-800/50 bg-[#020617]/50 p-4 text-sm text-slate-200 transition-all duration-150 hover:border-slate-700/50 hover:bg-[#020617] hover:shadow-sm">
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
            People
          </div>
          <div className="mt-2 text-3xl font-semibold text-slate-100">
            {loading ? "–" : peopleCount.toString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Current members in this org
          </div>
        </div>

        {/* Teams */}
        <div className="rounded-xl border border-slate-800/50 bg-[#020617]/50 p-4 text-sm text-slate-200 transition-all duration-150 hover:border-slate-700/50 hover:bg-[#020617] hover:shadow-sm">
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
            Teams
          </div>
          <div className="mt-2 text-3xl font-semibold text-slate-100">
            {loading ? "–" : teamCount.toString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Active teams
          </div>
        </div>

        {/* Departments */}
        <div className="rounded-xl border border-slate-800/50 bg-[#020617]/50 p-4 text-sm text-slate-200 transition-all duration-150 hover:border-slate-700/50 hover:bg-[#020617] hover:shadow-sm">
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
            Departments
          </div>
          <div className="mt-2 text-3xl font-semibold text-slate-100">
            {loading ? "–" : departmentCount.toString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Active departments
          </div>
        </div>

        {/* Roles */}
        <div className="rounded-xl border border-slate-800/50 bg-[#020617]/50 p-4 text-sm text-slate-200 transition-all duration-150 hover:border-slate-700/50 hover:bg-[#020617] hover:shadow-sm">
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
            Roles
          </div>
          <div className="mt-2 text-3xl font-semibold text-slate-100">
            {loading ? "–" : roleCount.toString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Active roles
          </div>
        </div>
      </div>
    </section>
  );
}

