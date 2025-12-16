import { DashboardProviders } from "./DashboardProviders";
import { DashboardLayoutClient } from "./DashboardLayoutClient";
import { getActiveOrgContext } from "@/server/orgContext";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let ctx;
  try {
    ctx = await getActiveOrgContext();
  } catch (error) {
    console.error("[DashboardLayout] Error getting org context:", error);
    // Fallback to null org context if there's an error
    ctx = { userId: null, orgId: null, orgName: null, role: "VIEWER" as const };
  }

  return (
    <DashboardProviders initialOrgId={ctx.orgId} initialOrgName={ctx.orgName}>
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </DashboardProviders>
  );
}
