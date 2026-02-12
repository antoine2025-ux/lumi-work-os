/**
 * Legacy org directory route — redirects to workspace-scoped directory.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgDirectoryPage() {
  await redirectToWorkspaceOrg("directory");
}
