"use client"

import { useQuery } from "@tanstack/react-query"

export function useFeatureFlags(workspaceId: string = "workspace-1") {
  return useQuery({
    queryKey: ["feature-flags", workspaceId],
    queryFn: async () => {
      const response = await fetch(`/api/feature-flags?workspaceId=${workspaceId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch feature flags")
      }
      const data = await response.json()
      return data.flags || {}
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  })
}

export function useFeatureFlag(key: string, workspaceId: string = "workspace-1") {
  const { data: flags, isLoading, error } = useFeatureFlags(workspaceId)
  
  return {
    enabled: flags?.[key] || false,
    isLoading,
    error
  }
}
