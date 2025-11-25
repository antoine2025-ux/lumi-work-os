import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserStatus } from './use-user-status'

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
  const { userStatus } = useUserStatus()

  return useQuery({
    queryKey: ['projects', userStatus?.workspaceId],
    queryFn: async () => {
      const response = await fetch(`/api/projects?workspaceId=${userStatus?.workspaceId}`)
      if (!response.ok) throw new Error('Failed to fetch projects')
      const data = await response.json()
      return (Array.isArray(data) ? data : (data.data || data.projects || [])) as Project[]
    },
    enabled: !!userStatus?.workspaceId,
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



