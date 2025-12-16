import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { getOrgChartData } from "@/lib/org/data.server";
import { OrgChartClient } from "./OrgChartClient";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";

export default async function OrgChartPage() {
  const context = await getOrgPermissionContext();

  if (!context) {
    return (
      <>
        <OrgPageHeader
          breadcrumb="ORG / ORG CHART"
          title="Org chart"
          description="See how departments connect across your organization."
        />
        <div className="px-10 pb-10">
          <OrgEmptyState
            title="No organization selected"
            description="You need to create or select a workspace to view the Org chart."
            primaryActionLabel="Create workspace"
            primaryActionHref="/welcome"
          />
        </div>
      </>
    );
  }

  const chartData = await getOrgChartData(context.orgId).catch((error) => {
    console.error("[OrgChartPage] Failed to load chart data:", error);
    return null;
  });

  return (
    <>
      <OrgPageViewTracker route="/org/chart" name="Org Chart" />
      <OrgChartClient orgId={context.orgId} chartData={chartData} />
    </>
  );
}
