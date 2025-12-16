"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { OrgNoAccessState } from "@/components/org/OrgNoAccessState";
import { isOrgNoAccessError } from "@/lib/orgErrorUtils";
import { OrgPermissionsDiagnostic } from "@/components/org/debug/OrgPermissionsDiagnostic";
import { OrgOverviewStatsRibbon } from "@/components/org/overview/OrgOverviewStatsRibbon";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";
import { OrganizationStructureSection } from "@/components/org/structure/OrganizationStructureSection";
import type { OrgOverviewStats, OrgInsightsSnapshot } from "@/lib/org/data.server";
import type { StructureTeam, StructureDepartment } from "@/types/org";

type OrgOverviewClientProps = {
  org: {
    id: string;
    name: string;
  };
  stats: OrgOverviewStats | null;
  statsError: string | null;
  teams: StructureTeam[] | null;
  departments: StructureDepartment[] | null;
  insightsSnapshot: OrgInsightsSnapshot | null;
  canViewInsights: boolean;
};

export function OrgOverviewClient({
  org,
  stats,
  statsError,
  teams,
  departments,
  insightsSnapshot,
  canViewInsights,
}: OrgOverviewClientProps) {
  const router = useRouter();

  const loading = !stats;
  const noAccess = isOrgNoAccessError(statsError);

  const isCompletelyEmpty =
    !loading &&
    !!stats &&
    stats.peopleCount === 0 &&
    stats.teamCount === 0 &&
    stats.departmentCount === 0 &&
    stats.openInvitesCount === 0;

  return (
    <div className="px-10 pb-10">
        {isCompletelyEmpty ? (
          <div className="mt-8">
            <OrgEmptyState
              title="Get started with your organization"
              description={
                <>
                  Welcome to your Org Center. Start by inviting team members or setting up your
                  structure.{" "}
                  <span className="text-slate-500">
                    Insights will appear once your team grows —{" "}
                    <Link href="/org/insights" className="text-blue-400 hover:underline">
                      learn more →
                    </Link>
                  </span>
                </>
              }
              primaryActionLabel="Invite your first member"
              primaryActionHref="/org/settings?tab=members"
              secondaryActionLabel="Set up structure"
              secondaryActionHref="/org/structure"
            />
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            {/* Unified metrics ribbon */}
            <OrgOverviewStatsRibbon
              stats={stats}
              insightsSnapshot={insightsSnapshot}
              canViewInsights={canViewInsights}
              loading={loading}
            />

            {/* Key workspaces */}
            <section className="space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                KEY WORKSPACES
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="flex flex-col rounded-3xl border border-white/5 bg-slate-900/80 shadow-[0_24px_80px_rgba(0,0,0,0.25)] p-6 md:p-7 transition-all duration-200 hover:-translate-y-[1px] hover:border-white/10 hover:bg-slate-900/90 hover:shadow-[0_24px_80px_rgba(0,0,0,0.35)] focus-within:ring-2 focus-within:ring-primary/60 focus-within:ring-offset-2 focus-within:ring-offset-slate-900 focus-within:outline-none">
                  <div className="mb-2 flex-1">
                    <h3 className="text-lg font-semibold text-slate-100">People directory</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      See everyone in your organization, their roles, and where they sit.
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Use this view to understand who is in the org and how they are distributed across
                      teams and departments.
                    </p>
                  </div>
                  <div className="mt-auto pt-3">
                    <Link
                      href="/org/people"
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-1.5 text-[13px] font-medium text-slate-900 shadow-sm transition-all duration-200 hover:bg-white hover:shadow-md hover:-translate-y-[1px] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
                    >
                      View People
                      <span className="ml-0.5">→</span>
                    </Link>
                  </div>
                </div>

                <div className="flex flex-col rounded-3xl border border-white/5 bg-slate-900/80 shadow-[0_24px_80px_rgba(0,0,0,0.25)] p-6 md:p-7 transition-all duration-200 hover:-translate-y-[1px] hover:border-white/10 hover:bg-slate-900/90 hover:shadow-[0_24px_80px_rgba(0,0,0,0.35)] focus-within:ring-2 focus-within:ring-primary/60 focus-within:ring-offset-2 focus-within:ring-offset-slate-900 focus-within:outline-none">
                  <div className="mb-2 flex-1">
                    <h3 className="text-lg font-semibold text-slate-100">Org structure</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Quickly navigate teams, departments, and role definitions.
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Start here when you&apos;re thinking in terms of groups, reporting lines, or
                      responsibilities rather than individual people.
                    </p>
                  </div>
                  <div className="mt-auto pt-3">
                    <Link
                      href="/org/structure"
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-1.5 text-[13px] font-medium text-slate-900 shadow-sm transition-all duration-200 hover:bg-white hover:shadow-md hover:-translate-y-[1px] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
                    >
                      View Structure
                      <span className="ml-0.5">→</span>
                    </Link>
                  </div>
                </div>

                <div className="flex flex-col rounded-3xl border border-white/5 bg-slate-900/80 shadow-[0_24px_80px_rgba(0,0,0,0.25)] p-6 md:p-7 transition-all duration-200 hover:-translate-y-[1px] hover:border-white/10 hover:bg-slate-900/90 hover:shadow-[0_24px_80px_rgba(0,0,0,0.35)] focus-within:ring-2 focus-within:ring-primary/60 focus-within:ring-offset-2 focus-within:ring-offset-slate-900 focus-within:outline-none">
                  <div className="mb-2 flex-1">
                    <h3 className="text-lg font-semibold text-slate-100">Org chart</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      See how departments connect across your organization.
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Visualize your organization's structure and understand reporting relationships
                      at a glance.
                    </p>
                  </div>
                  <div className="mt-auto pt-3">
                    <Link
                      href="/org/chart"
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-1.5 text-[13px] font-medium text-slate-900 shadow-sm transition-all duration-200 hover:bg-white hover:shadow-md hover:-translate-y-[1px] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
                    >
                      View Org Chart
                      <span className="ml-0.5">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* "What's possible here?" helper strip */}
            <section className="rounded-3xl border border-white/5 bg-slate-900/80 shadow-[0_24px_80px_rgba(0,0,0,0.25)] p-6 md:p-7">
              <div className="grid gap-8 md:grid-cols-3 items-start">
                {/* Column 1: Title + description */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                    What&apos;s possible here?
                  </div>
                  <p className="mt-3 text-sm text-slate-300/80 leading-relaxed">
                    The Org Center helps you understand how your organization is shaped and who is doing what, so you can grow without losing clarity.
                  </p>
                </div>
                {/* Column 2: Map your structure */}
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    1. Map your structure
                  </p>
                  <p className="mt-3 text-sm text-slate-300/80 leading-relaxed">
                    Add departments, teams, and roles so everyone knows how work is organized and where they fit.
                  </p>
                </div>
                {/* Column 3: Connect people to work */}
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    2. Connect people to work
                  </p>
                  <p className="mt-3 text-sm text-slate-300/80 leading-relaxed">
                    Invite teammates, assign them to teams and roles, and keep a single source of truth for who is responsible for what.
                  </p>
                </div>
              </div>
            </section>

            {/* Combined structure hierarchy view */}
            {departments && departments.length > 0 && (
              <OrganizationStructureSection departments={departments} teams={teams} />
            )}

            {noAccess && (
              <div className="mt-6">
                <OrgNoAccessState />
              </div>
            )}
          </div>
        )}
    </div>
  );
}


