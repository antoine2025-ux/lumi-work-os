// src/hooks/usePersonRoles.ts

"use client";

import { useQuery } from "@tanstack/react-query";

type PersonRole = {
  id: string;
  title: string;
  summary?: string;
  tags?: string[];
  owner?: string | null;
};

type PersonRolesResponse = {
  ok: boolean;
  roles: PersonRole[];
};

export function usePersonRoles(personContextId: string | null | undefined) {
  return useQuery<PersonRolesResponse>({
    queryKey: ["personRoles", personContextId],
    enabled: !!personContextId,
    queryFn: async () => {
      const res = await fetch("/api/org/people/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personContextId }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch person roles.");
      }

      return (await res.json()) as PersonRolesResponse;
    },
  });
}

