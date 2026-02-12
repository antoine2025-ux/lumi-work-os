/**
 * Legacy org settings — redirects to workspace-scoped org settings.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgSettingsPage() {
  await redirectToWorkspaceOrg("settings");
}
