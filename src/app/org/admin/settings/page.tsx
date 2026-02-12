/**
 * Legacy org admin settings — redirects to workspace-scoped admin/settings.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgAdminSettingsPage() {
  await redirectToWorkspaceOrg("admin/settings");
}
