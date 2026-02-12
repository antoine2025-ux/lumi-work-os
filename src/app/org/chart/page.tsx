/**
 * Legacy org chart route — redirects to workspace-scoped chart.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgChartPage() {
  await redirectToWorkspaceOrg("chart");
}
