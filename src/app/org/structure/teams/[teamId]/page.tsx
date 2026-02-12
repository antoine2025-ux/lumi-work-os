/**
 * Legacy org team detail — redirects to workspace-scoped structure/teams/[teamId].
 */

import { redirect } from "next/navigation";
import { getWorkspaceSlugForRedirect } from "@/lib/org/redirectToWorkspaceOrg";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default async function OldOrgTeamPage({ params }: PageProps) {
  const { teamId } = await params;
  const slug = await getWorkspaceSlugForRedirect();
  if (!slug) redirect("/login");
  redirect(`/w/${slug}/org/structure/teams/${teamId}`);
}
