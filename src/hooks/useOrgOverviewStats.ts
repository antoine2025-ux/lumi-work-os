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
        const res = await fetch(`/api/org/${org.id}/overview`);
        const json = await res.json();

        if (cancelled) return;

        if (!res.ok || !json.ok) {
          // 403 (OrgAuthError) responses will carry a human-friendly message like:
          // "You don't have access to this organization." We surface it directly.
          setError(json?.error?.message ?? "Failed to load org overview stats.");
          setStats(null);
          setIsLoading(false);
          return;
        }

        setStats(json.data as OrgOverviewStats);
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

