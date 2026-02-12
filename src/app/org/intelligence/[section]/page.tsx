/**
 * Legacy org intelligence section — redirects to workspace-scoped intelligence.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgIntelligenceSectionPage() {
  await redirectToWorkspaceOrg("intelligence");
}
