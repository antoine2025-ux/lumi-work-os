"use client";

import { useEffect, useState } from "react";
import type { OrgPermissionLevel } from "@/lib/orgPermissions";
import type { OrgSummary } from "@/types/org";

type UseCurrentOrgResult =
  | {
      org: OrgSummary | null;
      currentMemberRole: OrgPermissionLevel | null;
      isLoading: true;
      error: null;
    }
  | {
      org: OrgSummary | null;
      currentMemberRole: OrgPermissionLevel | null;
      isLoading: false;
      error: string | null;
    };

/**
 * Hook to get the current organization and the current user's role in it.
 *
 * Fetches from /api/org/current which returns both the org data and currentMemberRole.
 */
export function useCurrentOrg(): UseCurrentOrgResult {
  const [org, setOrg] = useState<OrgSummary | null>(null);
  const [currentMemberRole, setCurrentMemberRole] = useState<OrgPermissionLevel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const res = await fetch("/api/org/current");
        const json = await res.json();

        if (cancelled) return;

        if (!res.ok || !json.ok) {
          setError(json?.error?.message ?? "Failed to load current organization.");
          setOrg(null);
          setCurrentMemberRole(null);
          setIsLoading(false);
          return;
        }

        setOrg(json.data.org);
        setCurrentMemberRole(json.data.currentMemberRole ?? null);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error("[useCurrentOrg]", err);
        setError("Failed to load current organization.");
        setOrg(null);
        setCurrentMemberRole(null);
        setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return {
      org,
      currentMemberRole,
      isLoading: true as const,
      error: null,
    };
  }

  return {
    org,
    currentMemberRole,
    isLoading: false as const,
    error,
  };
}
