/**
 * Legacy org decision page — redirects to workspace-scoped admin/decisions.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgDecisionPage() {
  await redirectToWorkspaceOrg("admin/decisions");
}
