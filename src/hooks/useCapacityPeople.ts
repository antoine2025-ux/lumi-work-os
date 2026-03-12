"use client";

/**
 * Hook for fetching people capacity data.
 * Used by PeoplePageClient to populate the Capacity column.
 */

import { useState, useEffect, useCallback } from "react";
import type { PersonCapacityRow } from "@/components/org/people/PeopleTable";

type CoverageInfo = {
  configured: number;
  total: number;
  pct: number;
};

type CapacityPeopleResponse = {
  rows: PersonCapacityRow[];
  coverage: CoverageInfo;
  overloadedCount: number;
  underutilizedCount: number;
};

export function useCapacityPeople() {
  const [data, setData] = useState<CapacityPeopleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/org/capacity/people");
      if (!res.ok) {
        // Non-fatal: capacity is optional
        setData(null);
        return;
      }
      const json = await res.json();

      const rows: PersonCapacityRow[] = (json.rows ?? []).map(
        (r: {
          personId: string;
          status: PersonCapacityRow["status"];
          utilizationPct: number;
          hasContract: boolean;
          hasAvailability: boolean;
        }) => ({
          personId: r.personId,
          status: r.status,
          utilizationPct: r.utilizationPct,
          hasContract: r.hasContract,
          hasAvailability: r.hasAvailability,
        })
      );

      let overloaded = 0;
      let underutilized = 0;
      for (const r of rows) {
        if (r.status === "OVERLOADED" || r.status === "SEVERELY_OVERLOADED") overloaded++;
        else if (r.status === "UNDERUTILIZED") underutilized++;
      }

      setData({
        rows,
        coverage: json.coverage ?? { configured: 0, total: 0, pct: 0 },
        overloadedCount: overloaded,
        underutilizedCount: underutilized,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  const capacityMap = new Map<string, PersonCapacityRow>();
  if (data) {
    for (const row of data.rows) {
      capacityMap.set(row.personId, row);
    }
  }

  return {
    capacityMap,
    coverage: data?.coverage ?? null,
    overloadedCount: data?.overloadedCount ?? 0,
    underutilizedCount: data?.underutilizedCount ?? 0,
    loading,
    error,
    refresh: fetch_,
  };
}
