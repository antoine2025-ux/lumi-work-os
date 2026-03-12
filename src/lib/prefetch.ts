import { QueryClient } from '@tanstack/react-query'

/**
 * Aggressive prefetching utility to warm up the cache
 * This ensures data is ready before users navigate
 */

interface PageDraftResponse {
  id: string
  title: string
  isPublished: boolean
  updatedAt: string
  slug: string
  excerpt?: string
}

interface SessionDraftResponse {
  id: string
  draftTitle?: string | null
  draftBody?: string | null
  phase?: string | null
  updatedAt: string
}

interface DraftItem {
  id: string
  title: string
  type: 'page' | 'session'
  updatedAt: string
  url?: string
  excerpt?: string
}

export interface PrefetchOptions {
  workspaceId: string
  queryClient: QueryClient
}

/**
 * Prefetch all critical data in parallel
 * This runs immediately when the app loads
 * 
 * OPTIMIZED: Only prefetches metadata (lists), not full content
 * Full content is loaded on-demand when user opens a specific page
 */
export async function prefetchAllData(options: PrefetchOptions) {
  const { workspaceId, queryClient } = options
  
  const startTime = Date.now()

  // Prefetch all critical METADATA in parallel - lightweight, fast
  // We don't prefetch full page content - that's loaded on-demand
  const prefetchPromises = [
    // Workspaces - most important, users navigate between them
    queryClient.prefetchQuery({
      queryKey: ['workspaces', workspaceId],
      queryFn: async () => {
        const response = await fetch('/api/wiki/workspaces')
        if (!response.ok) throw new Error('Failed to fetch workspaces')
        return response.json()
      },
      staleTime: 5 * 60 * 1000,
    }),

    // Recent pages METADATA ONLY - no full content
    queryClient.prefetchQuery({
      queryKey: ['wiki-pages', 'recent', workspaceId, 20],
      queryFn: async () => {
        const response = await fetch('/api/wiki/recent-pages?limit=20')
        if (!response.ok) throw new Error('Failed to fetch pages')
        return response.json()
      },
      staleTime: 2 * 60 * 1000,
    }),

    // Personal space pages METADATA ONLY
    queryClient.prefetchQuery({
      queryKey: ['wiki-pages', 'recent', workspaceId, 20, 'personal'],
      queryFn: async () => {
        const response = await fetch('/api/wiki/recent-pages?limit=20&workspace_type=personal')
        if (!response.ok) throw new Error('Failed to fetch personal pages')
        return response.json()
      },
      staleTime: 2 * 60 * 1000,
    }),

    // Team workspace pages METADATA ONLY
    queryClient.prefetchQuery({
      queryKey: ['wiki-pages', 'recent', workspaceId, 20, 'team'],
      queryFn: async () => {
        const response = await fetch('/api/wiki/recent-pages?limit=20&workspace_type=team')
        if (!response.ok) throw new Error('Failed to fetch team pages')
        return response.json()
      },
      staleTime: 2 * 60 * 1000,
    }),

    // Projects METADATA ONLY
    queryClient.prefetchQuery({
      queryKey: ['projects', workspaceId],
      queryFn: async () => {
        // Note: workspaceId is not needed as query param - API gets it from auth context
        const response = await fetch('/api/projects')
        if (!response.ok) throw new Error('Failed to fetch projects')
        const data = await response.json()
        // API returns { projects: Project[], contextObjects: ContextObject[] }
        return data.projects || []
      },
      staleTime: 2 * 60 * 1000,
    }),

    // Drafts METADATA ONLY - no full content
    queryClient.prefetchQuery({
      queryKey: ['drafts', workspaceId],
      queryFn: async () => {
        const [unpublishedRes, sessionsRes] = await Promise.all([
          // Use metadata-only endpoint (no includeContent)
          fetch('/api/wiki/pages?isPublished=false&limit=10').catch(() => null),
          // Only fetch assistant sessions if we have a workspaceId (skip on public routes)
          workspaceId ? fetch(`/api/assistant/sessions?workspaceId=${workspaceId}&hasDraft=true`).catch(() => null) : Promise.resolve(null)
        ])

        const drafts: DraftItem[] = []

        if (unpublishedRes?.ok) {
          const unpublishedData = await unpublishedRes.json() as { data?: PageDraftResponse[] } | PageDraftResponse[]
          const pages = (Array.isArray(unpublishedData) ? unpublishedData : (unpublishedData as { data?: PageDraftResponse[] }).data || []) as PageDraftResponse[]
          const unpublishedPages = pages
            .filter((p) => !p.isPublished)
            .map((p) => ({
              id: p.id,
              title: p.title,
              type: 'page' as const,
              updatedAt: p.updatedAt,
              url: `/wiki/${p.slug}`,
              excerpt: p.excerpt || '' // Use excerpt, not full content
            }))
          drafts.push(...unpublishedPages)
        }

        if (sessionsRes?.ok) {
          const sessionsData = await sessionsRes.json() as SessionDraftResponse[] | unknown
          const draftSessions = (Array.isArray(sessionsData) ? sessionsData as SessionDraftResponse[] : [])
            .filter((s) => s.draftTitle && s.draftBody && s.phase !== 'published')
            .map((s) => ({
              id: s.id,
              title: s.draftTitle ?? '',
              type: 'session' as const,
              updatedAt: s.updatedAt,
              excerpt: s.draftBody?.substring(0, 100) + '...' // Only excerpt
            }))
          drafts.push(...draftSessions)
        }

        return drafts.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ).slice(0, 6)
      },
      staleTime: 1 * 60 * 1000,
    }),

    // NOTE: User status is now provided by UserStatusContext from the session
    // No need to prefetch it separately - this eliminates a redundant API call
  ]

  // Wait for all prefetches to complete (or fail silently)
  await Promise.allSettled(prefetchPromises)
  
}

/**
 * Prefetch content for a specific page (the "most likely next" page)
 * Called when user hovers over a page link or opens a space
 */
export async function prefetchPageContent(pageIdOrSlug: string, queryClient: QueryClient) {
  queryClient.prefetchQuery({
    queryKey: ['wiki-page', pageIdOrSlug],
    queryFn: async () => {
      const response = await fetch(`/api/wiki/pages/${pageIdOrSlug}`)
      if (!response.ok) throw new Error('Failed to fetch page')
      return response.json()
    },
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Prefetch data for a specific route
 * Called when user hovers over navigation links
 */
export function prefetchRoute(route: string, queryClient: QueryClient, workspaceId?: string) {
  // Don't prefetch if we don't have workspaceId
  if (!workspaceId) return

  // Prefetch based on route pattern
  if (route === '/spaces/home' || route === '/wiki' || route === '/spaces') {
    // Already prefetched, but ensure it's fresh
    queryClient.prefetchQuery({
      queryKey: ['workspaces', workspaceId],
      queryFn: async () => {
        const response = await fetch('/api/wiki/workspaces')
        if (!response.ok) throw new Error('Failed to fetch workspaces')
        return response.json()
      },
      staleTime: 5 * 60 * 1000,
    })
  } else if (route.startsWith('/wiki/personal-space')) {
    queryClient.prefetchQuery({
      queryKey: ['wiki-pages', 'recent', workspaceId, 20, 'personal'],
      queryFn: async () => {
        const response = await fetch('/api/wiki/recent-pages?limit=20&workspace_type=personal')
        if (!response.ok) throw new Error('Failed to fetch personal pages')
        return response.json()
      },
      staleTime: 2 * 60 * 1000,
    })
  } else if (route.startsWith('/wiki/home')) {
    queryClient.prefetchQuery({
      queryKey: ['wiki-pages', 'recent', workspaceId, 20, 'team'],
      queryFn: async () => {
        const response = await fetch('/api/wiki/recent-pages?limit=20&workspace_type=team')
        if (!response.ok) throw new Error('Failed to fetch team pages')
        return response.json()
      },
      staleTime: 2 * 60 * 1000,
    })
  } else if (route === '/projects') {
    queryClient.prefetchQuery({
      queryKey: ['projects', workspaceId],
      queryFn: async () => {
        // Note: workspaceId is not needed as query param - API gets it from auth context
        const response = await fetch('/api/projects')
        if (!response.ok) throw new Error('Failed to fetch projects')
        const data = await response.json()
        // API returns { projects: Project[], contextObjects: ContextObject[] }
        return data.projects || []
      },
      staleTime: 2 * 60 * 1000,
    })
  }
}

