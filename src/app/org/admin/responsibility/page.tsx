/**
 * Legacy org admin responsibility — redirects to workspace-scoped admin/responsibility.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgAdminResponsibilityPage() {
  await redirectToWorkspaceOrg("admin/responsibility");
}
