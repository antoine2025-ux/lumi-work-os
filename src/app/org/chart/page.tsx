/**
 * Org Chart Page - Server Component
 * 
 * Renders the organization chart visualization.
 * Uses getOrgChartData for department/team structure data.
 */

import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { getOrgChartData } from "@/lib/org/data.server";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgChartClient } from "./OrgChartClient";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";

export const dynamic = "force-dynamic";

export default async function OrgChartPage() {
  const context = await getOrgPermissionContext().catch(() => null);

  if (!context) {
    return (
      <>
        <OrgPageHeader
          title="Org Chart"
          description="Visualize your organization's structure"
        />
        <div className="px-10 pb-10">
          <OrgEmptyState
            title="Get started with your organization"
            description="Create a workspace to view your org chart."
            primaryActionLabel="Create workspace"
            primaryActionHref="/welcome?from=org"
          />
        </div>
      </>
    );
  }

  const chartData = await getOrgChartData(context.orgId);

  return (
    <>
      <OrgPageHeader
        title="Org chart"
        description="Visual overview of departments, teams, and people in your organization."
      />
      <div className="px-10 pb-10">
        <OrgChartClient
          orgId={context.orgId}
          chartData={chartData}
        />
      </div>
    </>
  );
}

