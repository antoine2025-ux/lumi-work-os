/**
 * Legacy org decision authority settings — redirects to workspace-scoped admin/decisions.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgDecisionAuthoritySettingsPage() {
  await redirectToWorkspaceOrg("admin/decisions");
}
