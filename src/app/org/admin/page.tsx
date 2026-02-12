/**
 * Legacy org admin root — redirects to workspace-scoped admin.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgAdminPage() {
  await redirectToWorkspaceOrg("admin");
}
