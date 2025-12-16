"use client";

import { useEffect, useState } from "react";
import { useCurrentOrg } from "./useCurrentOrg";
import type {
  StructureTeam,
  StructureDepartment,
  StructureRole,
} from "@/types/org";

type UseOrgStructureListsResult = {
  teams: StructureTeam[] | null;
  departments: StructureDepartment[] | null;
  roles: StructureRole[] | null;
  isLoading: boolean;
  error: string | null;
};

export function useOrgStructureLists(): UseOrgStructureListsResult {
  const { org, isLoading: isOrgLoading } = useCurrentOrg();
  const [teams, setTeams] = useState<StructureTeam[] | null>(null);
  const [departments, setDepartments] = useState<StructureDepartment[] | null>(null);
  const [roles, setRoles] = useState<StructureRole[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOrgLoading || !org) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const res = await fetch(`/api/org/${org.id}/structure`);
        const json = await res.json();

        if (cancelled) return;

        if (!res.ok || !json.ok) {
          // 403 (OrgAuthError) responses will carry a human-friendly message like:
          // "You don't have access to this organization." We surface it directly.
          setError(json?.error?.message ?? "Failed to load org structure.");
          setTeams(null);
          setDepartments(null);
          setRoles(null);
          setIsLoading(false);
          return;
        }

        setTeams(json.data.teams);
        setDepartments(json.data.departments);
        setRoles(json.data.roles);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error("[useOrgStructureLists]", err);
        setError("Failed to load org structure.");
        setTeams(null);
        setDepartments(null);
        setRoles(null);
        setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [org, isOrgLoading]);

  if (isOrgLoading || !org) {
    return {
      teams: null,
      departments: null,
      roles: null,
      isLoading: true,
      error: null,
    };
  }

  return { teams, departments, roles, isLoading, error };
}

