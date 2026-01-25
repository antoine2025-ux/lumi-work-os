/**
 * Workspace-Scoped Person Profile Page
 */

import { PersonProfilePageClient } from "@/app/org/people/[personId]/PersonProfilePageClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workspaceSlug: string; personId: string }>;
};

export default async function WorkspaceOrgPersonPage({ params }: PageProps) {
  const { personId } = await params;
  return <PersonProfilePageClient personId={personId} />;
}
