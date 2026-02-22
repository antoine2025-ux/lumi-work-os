"use client";

import { useEffect, useState } from "react";
import { useCurrentOrg } from "./useCurrentOrg";

export type OrgChartTeam = {
  id: string;
  name: string;
  leadName: string | null;
  headcount: number;
};

export type OrgChartDepartment = {
  id: string;
  name: string;
  teams: OrgChartTeam[];
};

export type OrgChartData = {
  departments: OrgChartDepartment[];
};

type UseOrgChartDataResult =
  | { data: null; isLoading: true; error: null }
  | { data: OrgChartData; isLoading: false; error: null }
  | { data: null; isLoading: false; error: string };

export function useOrgChartData(): UseOrgChartDataResult {
  const { org, isLoading: isOrgLoading } = useCurrentOrg();
  const [data, setData] = useState<OrgChartData | null>(null);
  const [_isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOrgLoading || !org) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const res = await fetch(`/api/org/chart`);
        const json = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          // Extract error message from response
          const errorMsg = json?.error || json?.hint || "Failed to load org chart.";
          setError(errorMsg);
          setData(null);
          setIsLoading(false);
          return;
        }

        // NEW endpoint returns data directly
        setData(json as OrgChartData);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error("[useOrgChartData]", err);
        setError("Failed to load org chart.");
        setData(null);
        setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [org, isOrgLoading]);

  if (isOrgLoading || !org) {
    return { data: null, isLoading: true, error: null };
  }

  if (error) {
    return { data: null, isLoading: false, error };
  }

  if (!data) {
    return { data: null, isLoading: true, error: null };
  }

  return { data, isLoading: false, error: null };
}
