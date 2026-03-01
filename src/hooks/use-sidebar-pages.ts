import { useQuery } from '@tanstack/react-query'
import { useUserStatusContext } from '@/providers/user-status-provider'

export interface SidebarPage {
  id: string
  title: string
  slug: string
  updatedAt: string
  author: string
}

export function useSidebarPages(spaceId: string | null, limit = 20) {
  const { workspaceId } = useUserStatusContext()

  return useQuery({
    queryKey: ['sidebar-pages', spaceId],
    queryFn: async () => {
      const params = new URLSearchParams({ spaceId: spaceId!, limit: limit.toString() })
      const response = await fetch(`/api/wiki/recent-pages?${params}`)
      if (!response.ok) throw new Error('Failed to fetch sidebar pages')
      return response.json() as Promise<SidebarPage[]>
    },
    enabled: !!spaceId && !!workspaceId,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  })
}
