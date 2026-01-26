/**
 * Intelligence Landing Page
 *
 * Premium, read-only synthesis surface that aggregates canonical Org truth.
 * Issues-first, deterministic, and fully explainable.
 *
 * Non-goals: charts, trends, analytics, data export.
 */

import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";
import { IntelligenceLandingClient } from "@/components/org/intelligence/IntelligenceLandingClient";

export const dynamic = "force-dynamic";

export default async function OrgIntelligencePage() {
  const context = await getOrgPermissionContext();

  if (!context) {
    return (
      <>
        <OrgPageHeader
          title="Intelligence"
          description="Derived insights from Org data. No manual inputs."
        />
        <div className="px-10 pb-10">
          <OrgEmptyState
            title="No organization selected"
            description="You need to create or select a workspace to access Intelligence."
            primaryActionLabel="Create workspace"
            primaryActionHref="/welcome"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <OrgPageViewTracker route="/org/intelligence" name="Intelligence" />
      <OrgPageHeader
        title="Intelligence"
        description="Derived insights from Org data. What needs attention right now."
      />
      <div className="px-10 pb-10">
        <IntelligenceLandingClient isAdmin={context.role === "ADMIN" || context.role === "OWNER"} />
      </div>
    </>
  );
}
