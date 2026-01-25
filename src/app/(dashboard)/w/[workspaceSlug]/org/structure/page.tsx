/**
 * Workspace-Scoped Org Structure Page
 */

import { getOrgStructure } from "@/lib/org/queries";
import { StructureClient } from "@/app/org/structure/structure-client";

export const dynamic = "force-dynamic";

export default async function WorkspaceOrgStructurePage() {
  const data = await getOrgStructure();

  return (
    <StructureClient
      departments={data?.departments ?? []}
      unassignedTeams={data?.unassignedTeams ?? []}
    />
  );
}
