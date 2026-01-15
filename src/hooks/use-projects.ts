import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserStatusContext } from '@/providers/user-status-provider'

export interface Project {
  id: string
  name: string
  description?: string
  status: string
  color?: string
  updatedAt?: string
  createdAt?: string
}

export function useProjects() {
  // Use centralized UserStatusContext - no separate API call needed
  const { workspaceId } = useUserStatusContext()

  return useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      const response = await fetch(`/api/projects?workspaceId=${workspaceId}`)
      if (!response.ok) throw new Error('Failed to fetch projects')
      const data = await response.json()
      return (Array.isArray(data) ? data : (data.data || data.projects || [])) as Project[]
    },
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
  })
}

export function useProjectPrefetch() {
  const queryClient = useQueryClient()

  return {
    prefetchProjects: (workspaceId: string) => {
      queryClient.prefetchQuery({
        queryKey: ['projects', workspaceId],
        queryFn: async () => {
          const response = await fetch(`/api/projects?workspaceId=${workspaceId}`)
          if (!response.ok) throw new Error('Failed to fetch projects')
          const data = await response.json()
          return Array.isArray(data) ? data : (data.data || data.projects || [])
        },
        staleTime: 2 * 60 * 1000,
      })
    }
  }
}



