import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserStatus } from './use-user-status'

export interface WikiWorkspace {
  id: string
  name: string
  type: 'personal' | 'team' | 'project' | null
  color?: string
  description?: string
  pageCount?: number
  lastUpdated?: string
  memberCount?: number
}

export function useWorkspaces() {
  const { userStatus } = useUserStatus()

  return useQuery({
    queryKey: ['workspaces', userStatus?.workspaceId],
    queryFn: async () => {
      const response = await fetch('/api/wiki/workspaces')
      if (!response.ok) throw new Error('Failed to fetch workspaces')
      return response.json() as Promise<WikiWorkspace[]>
    },
    enabled: !!userStatus?.workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes - workspaces don't change often
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
  })
}

export function useWorkspacePrefetch() {
  const queryClient = useQueryClient()

  return {
    prefetchWorkspace: (workspaceId: string) => {
      queryClient.prefetchQuery({
        queryKey: ['workspaces', workspaceId],
        queryFn: async () => {
          const response = await fetch('/api/wiki/workspaces')
          if (!response.ok) throw new Error('Failed to fetch workspaces')
          const workspaces = await response.json() as WikiWorkspace[]
          return workspaces.find(w => w.id === workspaceId)
        },
        staleTime: 5 * 60 * 1000,
      })
    }
  }
}

