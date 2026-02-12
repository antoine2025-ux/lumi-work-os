/**
 * Legacy org insights — redirects to workspace-scoped org home.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgInsightsPage() {
  await redirectToWorkspaceOrg();
}
