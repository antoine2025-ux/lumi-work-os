"use client";

import { useEffect, useState } from "react";
import { useCurrentOrg } from "./useCurrentOrg";
import type { OrgPerson } from "@/types/org";
import type { PeopleFilters } from "@/components/org/people/people-filters";

type UseOrgPeopleDirectoryResult = {
  people: OrgPerson[] | null;
  isLoading: boolean;
  error: string | null;
};

export function useOrgPeopleDirectory(filters: PeopleFilters): UseOrgPeopleDirectoryResult {
  const { org, isLoading: isOrgLoading } = useCurrentOrg();
  const [people, setPeople] = useState<OrgPerson[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOrgLoading || !org) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const params = new URLSearchParams();
        if (filters.q?.trim()) {
          params.set("q", filters.q.trim());
        }
        if (filters.teamId) {
          params.set("teamId", filters.teamId);
        }
        if (filters.departmentId) {
          params.set("departmentId", filters.departmentId);
        }
        if (filters.roleId) {
          params.set("roleId", filters.roleId);
        }

        const res = await fetch(`/api/org/${org.id}/people?` + params.toString());
        const json = await res.json();

        if (cancelled) return;

        if (!res.ok || !json.ok) {
          // 403 (OrgAuthError) responses will carry a human-friendly message like:
          // "You don't have access to this organization." We surface it directly.
          setError(json?.error?.message ?? "Failed to load people directory.");
          setPeople(null);
          setIsLoading(false);
          return;
        }

        setPeople(json.data as OrgPerson[]);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error("[useOrgPeopleDirectory]", err);
        setError("Failed to load people directory.");
        setPeople(null);
        setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [org, isOrgLoading, filters.q, filters.teamId, filters.departmentId, filters.roleId]);

  if (isOrgLoading || !org) {
    return { people: null, isLoading: true, error: null };
  }

  return { people, isLoading, error };
}

