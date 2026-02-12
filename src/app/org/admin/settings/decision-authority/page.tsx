/**
 * Legacy org decision authority — redirects to workspace-scoped admin/decisions.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgDecisionAuthorityPage() {
  await redirectToWorkspaceOrg("admin/decisions");
}
