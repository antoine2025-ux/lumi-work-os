/**
 * Legacy org structure route — redirects to workspace-scoped structure.
 * Pre-Phase 2.5 route; kept so old links and navigation resolve correctly.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldStructurePage() {
  await redirectToWorkspaceOrg("structure");
}
