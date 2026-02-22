/**
 * useOrgReadiness Hook
 * 
 * Provides a single source of truth for Org readiness status across tab pages.
 * Reuses the same logic and data as the Overview checklist.
 */

"use client";

import { OrgApi } from "@/components/org/api";
import type { OrgPeopleListDTO } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { computeOrgReadiness } from "@/components/org/readiness";

export function useOrgReadiness() {
  const peopleQ = useOrgQuery(() => OrgApi.listPeople(), []);
  const structureQ = useOrgQuery(() => OrgApi.getStructure(), []);
  const ownershipQ = useOrgQuery(() => OrgApi.getOwnership(), []);

  const loading = peopleQ.loading || structureQ.loading || ownershipQ.loading;
  const error = peopleQ.error || structureQ.error || ownershipQ.error;

  // Unwrap { ok, data: { people } } envelope from /api/org/people if present
  const rawPeopleData = peopleQ.data as unknown as { data?: OrgPeopleListDTO } | null;
  const unwrappedPeople = rawPeopleData?.data?.people
    ? rawPeopleData.data
    : (peopleQ.data as OrgPeopleListDTO | null);

  const readiness =
    !loading && !error && unwrappedPeople && structureQ.data && ownershipQ.data
      ? computeOrgReadiness({ people: unwrappedPeople, structure: structureQ.data, ownership: ownershipQ.data })
      : null;

  return { loading, error, readiness };
}

