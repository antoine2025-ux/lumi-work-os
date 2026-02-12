/**
 * Legacy org intelligence route — redirects to workspace-scoped intelligence.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgIntelligencePage() {
  await redirectToWorkspaceOrg("intelligence");
}
