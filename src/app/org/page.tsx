/**
 * Org Overview Page - Server Component
 * 
 * PERFORMANCE NOTE:
 * - getOrgPermissionContext() is cached per-request, so this call reuses
 *   the result from the layout (no duplicate database query).
 * - Heavy data loading is moved to OrgOverviewContent with Suspense boundary
 *   for progressive loading (page shell renders immediately, data loads async).
 */

// Internal docs:
// - Org Center tour: src/docs/org-center-tour.md
// - Org Center UX improvements: src/docs/org-center-ux-improvements.md

import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { OrgOverviewContent } from "./OrgOverviewContent";

export default async function OrgOverviewPage() {
  // PERFORMANCE: This call is cached per-request, reusing layout's result
  const context = await getOrgPermissionContext();

  if (!context) {
    return (
      <>
        <OrgPageHeader
          breadcrumb="ORG / ORG OVERVIEW"
          title="Org overview"
          description="See a high-level view of your organization's people, teams, and structure."
        />
        <div className="px-10 pb-10">
          <OrgEmptyState
            title="Get started with your organization"
            description="Create a workspace to start organizing your team, roles, and structure."
            primaryActionLabel="Create workspace"
            primaryActionHref="/welcome"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <OrgPageViewTracker route="/org" name="Org Overview" />
      <OrgPageHeader
        breadcrumb="ORG / ORG OVERVIEW"
        title="Org overview"
        description="See a high-level view of your organization's people, teams, and structure."
      />
      <OrgOverviewContent context={context} />
    </>
  );
}
