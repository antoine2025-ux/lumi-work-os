"use client";

import { useEffect, useState } from "react";
import { useCurrentOrg } from "./useCurrentOrg";

export type OrgOverviewStats = {
  peopleCount: number;
  teamCount: number;
  departmentCount: number;
  openInvitesCount: number;
};

type UseOrgOverviewStatsResult =
  | { stats: null; isLoading: true; error: null }
  | { stats: OrgOverviewStats; isLoading: false; error: null }
  | { stats: null; isLoading: false; error: string };

export function useOrgOverviewStats(): UseOrgOverviewStatsResult {
  const { org, isLoading: isOrgLoading } = useCurrentOrg();
  const [stats, setStats] = useState<OrgOverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOrgLoading || !org) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const res = await fetch(`/api/org/overview`);
        const json = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          // Extract error message from response
          const errorMsg = json?.error || json?.hint || "Failed to load org overview stats.";
          setError(errorMsg);
          setStats(null);
          setIsLoading(false);
          return;
        }

        // NEW endpoint returns { summary, readiness } directly
        const summary = json.summary || {};
        setStats({
          peopleCount: summary.peopleCount || 0,
          teamCount: summary.teamCount || 0,
          departmentCount: summary.deptCount || 0,
          openInvitesCount: 0, // Not available in new endpoint
        });
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error("[useOrgOverviewStats]", err);
        setError("Failed to load org overview stats.");
        setStats(null);
        setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [org, isOrgLoading]);

  if (isOrgLoading || !org) {
    return { stats: null, isLoading: true, error: null };
  }

  if (error) {
    return { stats: null, isLoading: false, error };
  }

  if (!stats) {
    return { stats: null, isLoading: true, error: null };
  }

  return { stats, isLoading: false, error: null };
}

