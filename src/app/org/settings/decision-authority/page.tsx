/**
 * Decision Authority Settings Page
 * 
 * Route: /org/settings/decision-authority
 * 
 * Configure decision domains and authority:
 * - Create/archive decision domains (SECURITY, HIRING, etc.)
 * - Set primary authority (person or role)
 * - Configure escalation paths
 * 
 * This page answers: "Who decides this type of thing?"
 */

import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { DecisionDomainListClient } from "@/components/org/decision/DecisionDomainListClient";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { hasOrgCapability } from "@/lib/org/capabilities";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";

export const dynamic = "force-dynamic";

export default async function DecisionAuthoritySettingsPage() {
  const context = await getOrgPermissionContext();

  if (!context) {
    return (
      <>
        <OrgPageHeader
          breadcrumb="ORG / SETTINGS / DECISION AUTHORITY"
          title="Decision Authority"
          description="Configure who decides for each domain and escalation paths."
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
          breadcrumb="ORG / SETTINGS / DECISION AUTHORITY"
          title="Decision Authority"
          description="Configure who decides for each domain and escalation paths."
        />
        <div className="px-10 pb-10">
          <OrgEmptyState
            title="Access restricted"
            description="You need admin permissions to configure decision authority."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <OrgPageViewTracker route="/org/settings/decision-authority" name="Decision Authority Settings" />
      <OrgPageHeader
        breadcrumb="ORG / SETTINGS / DECISION AUTHORITY"
        title="Decision Authority"
        description="Configure who decides for each domain and escalation paths."
      />
      <div className="px-10 pb-10">
        <DecisionDomainListClient />
      </div>
    </>
  );
}
