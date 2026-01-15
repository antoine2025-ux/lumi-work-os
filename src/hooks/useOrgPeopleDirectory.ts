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

type UseOrgPeopleDirectoryOptions = {
  refreshKey?: number;
};

export function useOrgPeopleDirectory(
  filters: PeopleFilters,
  options?: UseOrgPeopleDirectoryOptions
): UseOrgPeopleDirectoryResult {
  const { org, isLoading: isOrgLoading } = useCurrentOrg();
  const [people, setPeople] = useState<OrgPerson[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const refreshKey = options?.refreshKey ?? 0;

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

        const res = await fetch(`/api/org/people?` + params.toString());
        const json = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          // Extract error message from response
          const errorMsg = json?.error || json?.hint || "Failed to load people directory.";
          setError(errorMsg);
          setPeople(null);
          setIsLoading(false);
          return;
        }

        // NEW endpoint returns { people } directly
        setPeople(json.people || []);
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
  }, [org, isOrgLoading, filters.q, filters.teamId, filters.departmentId, filters.roleId, refreshKey]);

  if (isOrgLoading || !org) {
    return { people: null, isLoading: true, error: null };
  }

  return { people, isLoading, error };
}

