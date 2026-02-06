"use client";

/**
 * Hook for fetching team capacity rollup data.
 * Used by StructurePageClient to display capacity status on team cards.
 */

import { useState, useEffect, useCallback } from "react";
import type { CapacityStatus } from "@/components/org/capacity/CapacityStatusBadge";

export type TeamCapacityRow = {
  teamId: string;
  status: CapacityStatus;
  memberCount: number;
  availableHours: number;
  allocatedHours: number;
  utilizationPct: number;
  missingDataCount: number;
};

export function useCapacityTeams() {
  const [data, setData] = useState<TeamCapacityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/org/capacity/teams");
      if (!res.ok) {
        setData([]);
        return;
      }
      const json = await res.json();
      setData(
        (json.rows ?? []).map((r: TeamCapacityRow) => ({
          teamId: r.teamId,
          status: r.status,
          memberCount: r.memberCount,
          availableHours: r.availableHours,
          allocatedHours: r.allocatedHours,
          utilizationPct: r.utilizationPct,
          missingDataCount: r.missingDataCount,
        }))
      );
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  const teamCapacityMap = new Map<string, TeamCapacityRow>();
  for (const row of data) {
    teamCapacityMap.set(row.teamId, row);
  }

  return { teamCapacityMap, loading, refresh: fetch_ };
}
