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
        const res = await fetch(`/api/org/structure`);
        const json = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          // Extract error message from response
          const errorMsg = json?.error || json?.hint || "Failed to load org structure.";
          setError(errorMsg);
          setTeams(null);
          setDepartments(null);
          setRoles(null);
          setIsLoading(false);
          return;
        }

        // Validate response structure
        if (!json || (typeof json !== 'object')) {
          console.error("[useOrgStructureLists] Invalid response format:", json);
          setError("Invalid response format from server.");
          setTeams(null);
          setDepartments(null);
          setRoles(null);
          setIsLoading(false);
          return;
        }

        // NEW endpoint returns { departments, teams } directly
        // Transform to match expected format
        const departmentsList = (Array.isArray(json.departments) ? json.departments : []).map((d: any) => ({
          id: d.id,
          name: d.name,
          ownerPersonId: d.ownerPersonId || null,
          teamCount: d.teams?.length || 0, // Count teams in department
        }));
        
        // Create department map for looking up department names
        const departmentMap = new Map(
          departmentsList.map((d: any) => [d.id, d.name])
        );
        
        const teamsList = (Array.isArray(json.teams) ? json.teams : []).map((t: any) => ({
          id: t.id,
          name: t.name,
          departmentId: t.departmentId,
          departmentName: t.departmentId ? departmentMap.get(t.departmentId) || null : null,
          ownerPersonId: t.ownerPersonId || null,
          memberCount: t.memberCount || 0,
        }));
        
        setTeams(teamsList);
        setDepartments(departmentsList);
        setRoles([]); // Roles not available in new endpoint
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

