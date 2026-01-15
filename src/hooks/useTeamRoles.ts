// src/hooks/useTeamRoles.ts

"use client";

import { useQuery } from "@tanstack/react-query";

type TeamRole = {
  id: string;
  title: string;
  summary?: string;
  tags?: string[];
};

type TeamRolesResponse = {
  ok: boolean;
  roles: TeamRole[];
};

export function useTeamRoles(teamContextId: string | null | undefined) {
  return useQuery<TeamRolesResponse>({
    queryKey: ["teamRoles", teamContextId],
    enabled: !!teamContextId,
    queryFn: async () => {
      const res = await fetch("/api/org/teams/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamContextId }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch team roles.");
      }

      return (await res.json()) as TeamRolesResponse;
    },
  });
}

