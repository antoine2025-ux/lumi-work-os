/**
 * Legacy org intelligence snapshot — redirects to workspace-scoped intelligence.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgIntelligenceSnapshotPage() {
  await redirectToWorkspaceOrg("intelligence");
}
