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

  const readiness =
    !loading && !error && peopleQ.data && structureQ.data && ownershipQ.data
      ? computeOrgReadiness({ people: peopleQ.data, structure: structureQ.data, ownership: ownershipQ.data })
      : null;

  return { loading, error, readiness };
}

