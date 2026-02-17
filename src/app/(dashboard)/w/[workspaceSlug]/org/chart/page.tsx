/**
 * Workspace-Scoped Org Chart Page
 * 
 * Renders the organization chart visualization.
 */

import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { getOrgChartData } from "@/lib/org/data.server";
import { buildOrgChartTree } from "@/lib/org/projections/buildOrgChartTree";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgChartClient } from "@/app/org/chart/OrgChartClient";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function WorkspaceOrgChartPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const context = await getOrgPermissionContext().catch(() => null);

  if (!context) {
    return (
      <>
        <OrgPageHeader
          legacyBreadcrumb="ORG / CHART"
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
  
  // Build hierarchical tree for tree view
  const chartTree = await buildOrgChartTree(context.orgId, {
    includeVacant: true,
    maxDepth: 10,
  });

  return (
    <>
      <OrgPageHeader
        legacyBreadcrumb="ORG / ORG CHART"
        title="Org chart"
        description="Visual overview of departments, teams, and people in your organization."
      />
      <div className="px-10 pb-10">
        <OrgChartClient 
          orgId={context.orgId} 
          chartData={chartData}
          chartTree={chartTree}
        />
      </div>
    </>
  );
}
