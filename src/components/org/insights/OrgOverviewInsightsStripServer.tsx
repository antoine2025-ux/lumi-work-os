import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { hasOrgCapability } from "@/lib/org/capabilities";
import { getOrgInsightsSnapshot } from "@/lib/org/insights";
import { OrgOverviewInsightsStrip } from "./OrgOverviewInsightsStrip";

export async function OrgOverviewInsightsStripServer() {
  const permissionContext = await getOrgPermissionContext();

  if (
    !permissionContext ||
    !hasOrgCapability(permissionContext.role, "org:insights:view")
  ) {
    return null;
  }

  const snapshot = await getOrgInsightsSnapshot(permissionContext.orgId, permissionContext, {
    period: "month",
    periods: 3,
  });

  return <OrgOverviewInsightsStrip snapshot={snapshot} />;
}

