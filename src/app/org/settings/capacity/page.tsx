/**
 * Legacy org capacity settings — redirects to workspace-scoped admin/capacity.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgCapacitySettingsPage() {
  await redirectToWorkspaceOrg("admin/capacity");
}
