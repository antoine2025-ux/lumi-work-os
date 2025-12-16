// src/hooks/useOrgHealth.ts

"use client";

import { useQuery } from "@tanstack/react-query";
import type { OrgHealth } from "@/lib/org/healthTypes";

type OrgHealthResponse = {
  ok: boolean;
  health: OrgHealth;
};

export function useOrgHealth() {
  return useQuery<OrgHealthResponse>({
    queryKey: ["orgHealth"],
    queryFn: async () => {
      const res = await fetch("/api/org/health");

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch org health.");
      }

      return (await res.json()) as OrgHealthResponse;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

