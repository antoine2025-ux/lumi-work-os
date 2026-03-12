/**
 * Server component that loads and renders the main Overview content.
 * Wrapped in Suspense to allow progressive loading.
 */

import { Suspense } from "react";
import { getOrgOverviewStats, getOrgInsights } from "@/lib/org/data.server";
import { OrgOverviewClient } from "./OrgOverviewClient";
import { OrgOverviewStatsSkeleton, OrgOverviewKeyWorkspacesSkeleton } from "@/components/org/skeletons/OrgOverviewSkeleton";
import { hasOrgCapability } from "@/lib/org/capabilities";
import type { OrgPermissionContext } from "@/lib/org/permissions.server";
import { getOrgSetupStatus } from "@/server/org/setup/status";
import { getOrgOverviewSummary } from "@/server/org/overview/summary";
import { OrgHealthSummary } from "@/components/org/health/OrgHealthSummary";
import { OrgCard } from "@/components/org/ui/OrgCard";
import { orgTokens } from "@/components/org/ui/tokens";
import Link from "next/link";

type OrgOverviewContentProps = {
  context: OrgPermissionContext;
};

async function OverviewDataLoader({ context }: OrgOverviewContentProps) {
  const canViewInsights = hasOrgCapability(context.role, "org:insights:view");

  // PERFORMANCE: Load data in parallel, with error handling
  const startTime = process.env.NODE_ENV !== "production" ? Date.now() : 0;
  
  const [stats, insights, setupStatus, summary] = await Promise.allSettled([
    getOrgOverviewStats(context.workspaceId, context.userId).catch((error) => {
      console.error("[OverviewDataLoader] Error loading stats:", error);
      return null; // Return null instead of throwing
    }),
    canViewInsights
      ? getOrgInsights(context.workspaceId, context, {
          period: "month",
          periods: 3,
        }).catch((error) => {
          console.error("[OverviewDataLoader] Error loading insights:", error);
          return null;
        })
      : Promise.resolve(null),
    getOrgSetupStatus(context.workspaceId).catch((error) => {
      console.error("[OverviewDataLoader] Error loading setup status:", error);
      return null; // Return null instead of throwing
    }),
    getOrgOverviewSummary(context.workspaceId).catch((error) => {
      console.error("[OverviewDataLoader] Error loading summary:", error);
      return null; // Return null instead of throwing
    }),
  ]);

  if (process.env.NODE_ENV !== "production" && startTime) {
    const duration = Date.now() - startTime;
    if (duration > 200) {
      console.log(`[OrgOverview] Data loading took ${duration}ms`);
    }
  }

  const statsData = stats.status === "fulfilled" ? stats.value : null;
  const statsError = stats.status === "rejected" ? stats.reason?.message || "Failed to load stats" : null;
  const insightsData = insights.status === "fulfilled" ? insights.value : null;
  const setup = setupStatus.status === "fulfilled" ? setupStatus.value : null;
  const summaryData = summary.status === "fulfilled" ? summary.value : null;

  // MVP: Single primary CTA - "Complete setup" if incomplete, otherwise show health summary
  const hasIncompleteSetup = summaryData?.completeness && summaryData.completeness.some((c: { ok: boolean }) => !c.ok)
  const showLegacySetupBanner = setup?.setupIncomplete && !summaryData?.completeness

  return (
    <>
      <div className="px-10 pb-10">
        {/* Health summary with derived signals - always show */}
        <div className="mt-4">
          <OrgHealthSummary workspaceId={context.workspaceId} />
        </div>

        {/* Primary CTA: Complete setup (only if incomplete) */}
        {hasIncompleteSetup && (
          <div className="mt-4">
            <OrgCard
              title="Complete setup"
              subtitle="Finish these items to enable full Loopbrain functionality."
            >
              <ul className="space-y-2 mb-4">
                {summaryData.completeness.filter((c: { ok: boolean; key: string; label: string }) => !c.ok).map((c: { ok: boolean; key: string; label: string }) => (
                  <li key={c.key} className={orgTokens.subtleText}>
                    • {c.label}
                  </li>
                ))}
              </ul>
              <Link href="/org/setup" className={orgTokens.button}>
                Complete setup
              </Link>
            </OrgCard>
          </div>
        )}

        {/* Legacy setup banner fallback (only if completeness check failed) */}
        {showLegacySetupBanner && (
          <div className="mt-4">
            <OrgCard
              title="Complete setup"
              subtitle={
                setup.peopleCount === 0 && setup.teamCount === 0
                  ? "Add at least 1 person and 1 team to complete setup."
                  : setup.peopleCount === 0
                  ? "Add at least 1 person to complete setup."
                  : "Add at least 1 team to complete setup."
              }
            >
              <Link href="/org/setup" className={orgTokens.button}>
                Complete setup
              </Link>
            </OrgCard>
          </div>
        )}
      </div>
      
      {/* Stats and insights (if available) - keep but make it clear it's secondary */}
      {statsData && (
        <OrgOverviewClient
          org={{ id: context.workspaceId, name: "Organization" }}
          stats={statsData}
          statsError={statsError}
          insightsSnapshot={insightsData}
          canViewInsights={canViewInsights}
        />
      )}
    </>
  );
}

export function OrgOverviewContent({ context }: OrgOverviewContentProps) {
  return (
    <Suspense
      fallback={
        <div className="px-10 pb-10">
          <div className="mt-6 space-y-6">
            <OrgOverviewStatsSkeleton />
            <OrgOverviewKeyWorkspacesSkeleton />
          </div>
        </div>
      }
    >
      <OverviewDataLoader context={context} />
    </Suspense>
  );
}

