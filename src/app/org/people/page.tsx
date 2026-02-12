/**
 * Legacy org people list route — redirects to workspace-scoped people.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgPeoplePage() {
  await redirectToWorkspaceOrg("people");
}
