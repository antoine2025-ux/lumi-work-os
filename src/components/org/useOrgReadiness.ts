/**
 * useOrgReadiness Hook
 * 
 * Provides a single source of truth for Org readiness status across tab pages.
 * Reuses the same logic and data as the Overview checklist.
 */

"use client";

import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { computeOrgReadiness } from "@/components/org/readiness";

export function useOrgReadiness() {
  const peopleQ = useOrgQuery(() => OrgApi.listPeople(), []);
  const structureQ = useOrgQuery(() => OrgApi.getStructure(), []);
  const ownershipQ = useOrgQuery(() => OrgApi.getOwnership(), []);

  const loading = peopleQ.loading || structureQ.loading || ownershipQ.loading;
  const error = peopleQ.error || structureQ.error || ownershipQ.error;

  // Unwrap { ok, data: { people } } envelope from /api/org/people if present
  const unwrappedPeople = (peopleQ.data as any)?.data?.people
    ? (peopleQ.data as any).data
    : peopleQ.data;

  const readiness =
    !loading && !error && unwrappedPeople && structureQ.data && ownershipQ.data
      ? computeOrgReadiness({ people: unwrappedPeople, structure: structureQ.data, ownership: ownershipQ.data })
      : null;

  return { loading, error, readiness };
}

