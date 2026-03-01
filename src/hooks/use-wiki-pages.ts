import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserStatusContext } from '@/providers/user-status-provider'

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
  // Use centralized UserStatusContext - no separate API call needed
  const { workspaceId } = useUserStatusContext()

  return useQuery({
    queryKey: ['wiki-pages', 'recent', workspaceId, limit, workspaceType],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: limit.toString() })
      if (workspaceType) params.append('workspace_type', workspaceType)
      
      const response = await fetch(`/api/wiki/recent-pages?${params}`)
      if (!response.ok) throw new Error('Failed to fetch pages')
      return response.json() as Promise<WikiPage[]>
    },
    enabled: !!workspaceId,
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

/** Fetches Company Wiki pages only (spaceId = companyWikiSpaceId). Use for sidebar. Query key aligns with sidebar-pages for prefix invalidation. */
export function useCompanyWikiPages(limit: number = 15) {
  const { workspaceId } = useUserStatusContext()

  return useQuery({
    queryKey: ['sidebar-pages', 'company-wiki'],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: limit.toString(), scope: 'company-wiki' })
      const response = await fetch(`/api/wiki/recent-pages?${params}`)
      if (!response.ok) throw new Error('Failed to fetch company wiki pages')
      return response.json() as Promise<WikiPage[]>
    },
    enabled: !!workspaceId,
    staleTime: 30_000,
  })
}



