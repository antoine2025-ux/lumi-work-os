import { getOrgStructure } from "@/lib/org/queries";
import { StructureClient } from "./structure-client";

export const dynamic = "force-dynamic";

export default async function StructurePage() {
  const data = await getOrgStructure();

  return (
    <StructureClient
      departments={data?.departments ?? []}
      unassignedTeams={data?.unassignedTeams ?? []}
    />
  );
}
