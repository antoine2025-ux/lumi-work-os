/**
 * Legacy org activity route — redirects to workspace-scoped activity.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgActivityPage() {
  await redirectToWorkspaceOrg("activity");
}
