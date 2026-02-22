import { useQuery } from '@tanstack/react-query'
import { useUserStatusContext } from '@/providers/user-status-provider'

export interface Draft {
  id: string
  title: string
  type: 'page' | 'session'
  updatedAt: string
  url?: string
  excerpt?: string
}

export function useDrafts() {
  // Use centralized UserStatusContext - no separate API call needed
  const { workspaceId } = useUserStatusContext()

  return useQuery({
    queryKey: ['drafts', workspaceId],
    queryFn: async (): Promise<Draft[]> => {
      if (!workspaceId) return []

      // Fetch unpublished pages and draft sessions in parallel
      // Only fetch assistant sessions if we have a workspaceId
      const [unpublishedRes, sessionsRes] = await Promise.all([
        fetch('/api/wiki/pages?isPublished=false&limit=10').catch(() => null),
        workspaceId 
          ? fetch(`/api/assistant/sessions?workspaceId=${workspaceId}&hasDraft=true`).catch(() => null)
          : Promise.resolve(null)
      ])

      const drafts: Draft[] = []

      // Process unpublished pages
      if (unpublishedRes?.ok) {
        const unpublishedData = await unpublishedRes.json()
        const unpublishedPages = (Array.isArray(unpublishedData) ? unpublishedData : unpublishedData.data || [])
          .filter((p: Record<string, unknown>) => !p.isPublished)
          .map((p: Record<string, unknown>) => ({
            id: p.id as string,
            title: p.title as string,
            type: 'page' as const,
            updatedAt: p.updatedAt as string,
            url: `/wiki/${p.slug as string}`,
            excerpt: (p.excerpt as string) || (p.content as string)?.substring(0, 100) + '...'
          }))
        drafts.push(...unpublishedPages)
      }

      // Process draft sessions
      if (sessionsRes?.ok) {
        const sessionsData = await sessionsRes.json()
        const draftSessions = (Array.isArray(sessionsData) ? sessionsData : [])
          .filter((s: Record<string, unknown>) => s.draftTitle && s.draftBody && s.phase !== 'published')
          .map((s: Record<string, unknown>) => ({
            id: s.id as string,
            title: s.draftTitle as string,
            type: 'session' as const,
            updatedAt: s.updatedAt as string,
            excerpt: (s.draftBody as string)?.substring(0, 100) + '...'
          }))
        drafts.push(...draftSessions)
      }

      return drafts.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ).slice(0, 6)
    },
    enabled: !!workspaceId,
    staleTime: 1 * 60 * 1000, // 1 minute - drafts change frequently
    gcTime: 3 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}



