/**
 * Legacy org issues route — redirects to workspace-scoped admin/health.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgIssuesPage() {
  await redirectToWorkspaceOrg("admin/health");
}
