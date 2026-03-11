/**
 * Server component that loads and renders Structure content.
 * Wrapped in Suspense to allow progressive loading.
 */

import { Suspense } from "react";
import { getOrgStructureLists } from "@/lib/org/data.server";
import { StructurePageClient } from "./StructurePageClient";
import { OrgPeopleTableSkeleton } from "@/components/org/skeletons/OrgPeopleSkeleton";
import type { OrgPermissionContext } from "@/lib/org/permissions.server";
import { getOrgInsightsSnapshot } from "@/lib/org/insights";
import { hasOrgCapability } from "@/lib/org/capabilities";

type StructureContentProps = {
  context: OrgPermissionContext;
};

async function StructureDataLoader({ context }: StructureContentProps) {
  const startTime = process.env.NODE_ENV !== "production" ? Date.now() : 0;
  
  const structure = await getOrgStructureLists(context.workspaceId, context.userId).catch((error) => {
    console.error("[StructurePage] Failed to load structure:", error);
    return { teams: [], departments: [], roles: [] };
  });

  // Load insights data for top departments (if user has permission)
  let topDepartmentsInsights: Array<{ name: string; headcount: number }> | null = null;
  if (hasOrgCapability(context.role, "org:insights:view")) {
    try {
      const snapshot = await getOrgInsightsSnapshot(context.workspaceId, context, {
        period: "month",
        periods: 3,
      });
      
      topDepartmentsInsights = snapshot.byDepartment
        .filter((d) => d.headcount > 0)
        .sort((a, b) => b.headcount - a.headcount)
        .slice(0, 3)
        .map((d) => ({
          name: d.departmentName || "Unassigned",
          headcount: d.headcount,
        }));
      
      if (topDepartmentsInsights.length === 0) {
        topDepartmentsInsights = null;
      }
    } catch (error: unknown) {
      console.error("[StructurePage] Failed to load insights:", error);
      // Continue without insights
    }
  }

  if (process.env.NODE_ENV !== "production" && startTime) {
    const duration = Date.now() - startTime;
    if (duration > 200) {
      console.log(`[StructurePage] Data loading took ${duration}ms`);
    }
  }

  return (
    <StructurePageClient
      orgId={context.workspaceId}
      role={context.role}
      initialTeams={structure.teams}
      initialDepartments={structure.departments}
      initialRoles={structure.roles}
      topDepartmentsInsights={topDepartmentsInsights}
    />
  );
}

export function StructureContent({ context }: StructureContentProps) {
  return (
    <Suspense
      fallback={
        <div className="px-10 pb-10">
          <OrgPeopleTableSkeleton />
        </div>
      }
    >
      <StructureDataLoader context={context} />
    </Suspense>
  );
}

