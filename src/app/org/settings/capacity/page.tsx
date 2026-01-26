/**
 * Capacity Settings Page
 * 
 * Route: /org/settings/capacity
 * 
 * Configure capacity thresholds:
 * - Low capacity hours threshold
 * - Overallocation threshold
 * - Minimum hours for coverage viability
 * - Issue detection window
 * 
 * This page answers: "What do we consider 'too much' or 'too little' capacity?"
 */

import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { CapacitySettingsClient } from "@/components/org/settings/CapacitySettingsClient";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { hasOrgCapability } from "@/lib/org/capabilities";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";

export const dynamic = "force-dynamic";

export default async function CapacitySettingsPage() {
  const context = await getOrgPermissionContext();

  if (!context) {
    return (
      <>
        <OrgPageHeader
          breadcrumb="ORG / SETTINGS / CAPACITY"
          title="Capacity Settings"
          description="Defaults and thresholds used for capacity reasoning."
        />
        <div className="px-10 pb-10">
          <OrgEmptyState
            title="No organization selected"
            description="You need to create or select a workspace to access settings."
            primaryActionLabel="Create workspace"
            primaryActionHref="/welcome"
          />
        </div>
      </>
    );
  }

  // Admin-only access
  const canManage = hasOrgCapability(context.role, "org:org:update");
  if (!canManage) {
    return (
      <>
        <OrgPageHeader
          breadcrumb="ORG / SETTINGS / CAPACITY"
          title="Capacity Settings"
          description="Defaults and thresholds used for capacity reasoning."
        />
        <div className="px-10 pb-10">
          <OrgEmptyState
            title="Access restricted"
            description="You need admin permissions to configure capacity settings."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <OrgPageViewTracker route="/org/settings/capacity" name="Capacity Settings" />
      <OrgPageHeader
        breadcrumb="ORG / SETTINGS / CAPACITY"
        title="Capacity Settings"
        description="Defaults and thresholds used for capacity reasoning."
      />
      <div className="px-10 pb-10">
        <CapacitySettingsClient />
      </div>
    </>
  );
}
