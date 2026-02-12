/**
 * Legacy org responsibility settings — redirects to workspace-scoped admin/responsibility.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgResponsibilitySettingsPage() {
  await redirectToWorkspaceOrg("admin/responsibility");
}
