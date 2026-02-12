/**
 * Legacy org root route — redirects to workspace-scoped org home.
 * Pre-Phase 2.5 route; kept so old links resolve correctly.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgRootPage() {
  await redirectToWorkspaceOrg();
}
