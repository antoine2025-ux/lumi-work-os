/**
 * Legacy org ownership route — redirects to workspace-scoped ownership.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgOwnershipPage() {
  await redirectToWorkspaceOrg("ownership");
}
