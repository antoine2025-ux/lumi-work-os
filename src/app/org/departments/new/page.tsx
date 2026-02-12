/**
 * Legacy new department route — redirects to workspace-scoped structure.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgNewDepartmentPage() {
  await redirectToWorkspaceOrg("structure");
}
