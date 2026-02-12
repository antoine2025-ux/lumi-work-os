/**
 * Legacy org intelligence drilldowns — redirects to workspace-scoped intelligence/drilldowns.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgIntelligenceDrilldownsPage() {
  await redirectToWorkspaceOrg("intelligence/drilldowns");
}
