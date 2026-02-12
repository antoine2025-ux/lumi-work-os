/**
 * Legacy org admin health — redirects to workspace-scoped admin/health.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgAdminHealthPage() {
  await redirectToWorkspaceOrg("admin/health");
}
