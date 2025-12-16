import { useQuery } from '@tanstack/react-query'
import { useUserStatus } from './use-user-status'

export interface Draft {
  id: string
  title: string
  type: 'page' | 'session'
  updatedAt: string
  url?: string
  excerpt?: string
}

export function useDrafts() {
  const { userStatus } = useUserStatus()

  return useQuery({
    queryKey: ['drafts', userStatus?.workspaceId],
    queryFn: async (): Promise<Draft[]> => {
      if (!userStatus?.workspaceId) return []

      // Fetch unpublished pages and draft sessions in parallel
      // Only fetch assistant sessions if we have a workspaceId
      const [unpublishedRes, sessionsRes] = await Promise.all([
        fetch('/api/wiki/pages?isPublished=false&limit=10').catch(() => null),
        userStatus.workspaceId 
          ? fetch(`/api/assistant/sessions?workspaceId=${userStatus.workspaceId}&hasDraft=true`).catch(() => null)
          : Promise.resolve(null)
      ])

      const drafts: Draft[] = []

      // Process unpublished pages
      if (unpublishedRes?.ok) {
        const unpublishedData = await unpublishedRes.json()
        const unpublishedPages = (Array.isArray(unpublishedData) ? unpublishedData : unpublishedData.data || [])
          .filter((p: any) => !p.isPublished)
          .map((p: any) => ({
            id: p.id,
            title: p.title,
            type: 'page' as const,
            updatedAt: p.updatedAt,
            url: `/wiki/${p.slug}`,
            excerpt: p.excerpt || p.content?.substring(0, 100) + '...'
          }))
        drafts.push(...unpublishedPages)
      }

      // Process draft sessions
      if (sessionsRes?.ok) {
        const sessionsData = await sessionsRes.json()
        const draftSessions = (Array.isArray(sessionsData) ? sessionsData : [])
          .filter((s: any) => s.draftTitle && s.draftBody && s.phase !== 'published')
          .map((s: any) => ({
            id: s.id,
            title: s.draftTitle,
            type: 'session' as const,
            updatedAt: s.updatedAt,
            excerpt: s.draftBody?.substring(0, 100) + '...'
          }))
        drafts.push(...draftSessions)
      }

      return drafts.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ).slice(0, 6)
    },
    enabled: !!userStatus?.workspaceId,
    staleTime: 1 * 60 * 1000, // 1 minute - drafts change frequently
    gcTime: 3 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}



