/**
 * Legacy org admin decisions — redirects to workspace-scoped admin/decisions.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgAdminDecisionsPage() {
  await redirectToWorkspaceOrg("admin/decisions");
}
