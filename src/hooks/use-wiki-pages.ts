import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserStatus } from './use-user-status'

export interface WikiPage {
  id: string
  title: string
  slug: string
  updatedAt: string
  author: string
  permissionLevel?: string
  workspace_type?: string
  excerpt?: string
}

export function useRecentPages(limit: number = 20, workspaceType?: string) {
  const { userStatus } = useUserStatus()

  return useQuery({
    queryKey: ['wiki-pages', 'recent', userStatus?.workspaceId, limit, workspaceType],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: limit.toString() })
      if (workspaceType) params.append('workspace_type', workspaceType)
      
      const response = await fetch(`/api/wiki/recent-pages?${params}`)
      if (!response.ok) throw new Error('Failed to fetch pages')
      return response.json() as Promise<WikiPage[]>
    },
    enabled: !!userStatus?.workspaceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
  })
}

export function useWikiPagePrefetch() {
  const queryClient = useQueryClient()

  return {
    prefetchPages: (workspaceType?: string) => {
      queryClient.prefetchQuery({
        queryKey: ['wiki-pages', 'recent', workspaceType],
        queryFn: async () => {
          const params = new URLSearchParams({ limit: '20' })
          if (workspaceType) params.append('workspace_type', workspaceType)
          
          const response = await fetch(`/api/wiki/recent-pages?${params}`)
          if (!response.ok) throw new Error('Failed to fetch pages')
          return response.json()
        },
        staleTime: 2 * 60 * 1000,
      })
    }
  }
}

