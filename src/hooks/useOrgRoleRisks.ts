// src/hooks/useOrgRoleRisks.ts

"use client";

import { useQuery } from "@tanstack/react-query";

export type RoleRiskItem = {
  id: string;
  title: string;
};

export type OrgRoleRisks = {
  withoutOwner: RoleRiskItem[];
  withoutResponsibilities: RoleRiskItem[];
  withoutTeam: RoleRiskItem[];
  withoutDepartment: RoleRiskItem[];
};

type OrgRoleRisksResponse = {
  ok: boolean;
  roleRisks: OrgRoleRisks;
};

export function useOrgRoleRisks() {
  return useQuery<OrgRoleRisksResponse>({
    queryKey: ["orgRoleRisks"],
    queryFn: async () => {
      const res = await fetch("/api/org/rankings");

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch Org role risks.");
      }

      const json = await res.json();

      return {
        ok: json.ok,
        roleRisks: json.roleRisks as OrgRoleRisks,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

