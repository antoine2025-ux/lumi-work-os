/**
 * Server component that loads and renders the main Overview content.
 * Wrapped in Suspense to allow progressive loading.
 */

import { Suspense } from "react";
import { getOrgOverviewStats, getOrgStructureLists, getOrgInsights } from "@/lib/org/data.server";
import { OrgOverviewClient } from "./OrgOverviewClient";
import { OrgOverviewStatsSkeleton, OrgOverviewKeyWorkspacesSkeleton, OrgOverviewStructureSkeleton } from "@/components/org/skeletons/OrgOverviewSkeleton";
import { hasOrgCapability } from "@/lib/org/capabilities";
import type { OrgPermissionContext } from "@/lib/org/permissions.server";

type OrgOverviewContentProps = {
  context: OrgPermissionContext;
};

async function OverviewDataLoader({ context }: OrgOverviewContentProps) {
  const canViewInsights = hasOrgCapability(context.role, "org:insights:view");

  // PERFORMANCE: Load data in parallel, with error handling
  const startTime = process.env.NODE_ENV !== "production" ? Date.now() : 0;
  
  const [stats, structure, insights] = await Promise.allSettled([
    getOrgOverviewStats(context.orgId, context.userId),
    getOrgStructureLists(context.orgId, context.userId),
    canViewInsights
      ? getOrgInsights(context.orgId, context, {
          period: "month",
          periods: 3,
        }).catch(() => null)
      : Promise.resolve(null),
  ]);

  if (process.env.NODE_ENV !== "production" && startTime) {
    const duration = Date.now() - startTime;
    if (duration > 200) {
      console.log(`[OrgOverview] Data loading took ${duration}ms`);
    }
  }

  const statsData = stats.status === "fulfilled" ? stats.value : null;
  const statsError = stats.status === "rejected" ? stats.reason?.message || "Failed to load stats" : null;
  const structureData = structure.status === "fulfilled" ? structure.value : null;
  const insightsData = insights.status === "fulfilled" ? insights.value : null;

  return (
    <OrgOverviewClient
      org={{ id: context.orgId, name: "Organization" }}
      stats={statsData}
      statsError={statsError}
      teams={structureData?.teams ?? null}
      departments={structureData?.departments ?? null}
      insightsSnapshot={insightsData}
      canViewInsights={canViewInsights}
    />
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
            <OrgOverviewStructureSkeleton />
          </div>
        </div>
      }
    >
      <OverviewDataLoader context={context} />
    </Suspense>
  );
}

