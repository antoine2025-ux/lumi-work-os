/**
 * Legacy org add person route — redirects to workspace-scoped people/new.
 */

import { redirectToWorkspaceOrg } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

export default async function OldOrgPeopleNewPage() {
  await redirectToWorkspaceOrg("people/new");
}
