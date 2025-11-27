import { QueryClient } from '@tanstack/react-query'

/**
 * Aggressive prefetching utility to warm up the cache
 * This ensures data is ready before users navigate
 */

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
  
  console.log('[Prefetch] Starting metadata prefetching for workspace:', workspaceId)
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
    }).then(() => console.log('[Prefetch] ✓ Workspaces metadata cached')),

    // Recent pages METADATA ONLY - no full content
    queryClient.prefetchQuery({
      queryKey: ['wiki-pages', 'recent', workspaceId, 20],
      queryFn: async () => {
        const response = await fetch('/api/wiki/recent-pages?limit=20')
        if (!response.ok) throw new Error('Failed to fetch pages')
        return response.json()
      },
      staleTime: 2 * 60 * 1000,
    }).then(() => console.log('[Prefetch] ✓ Recent pages metadata cached')),

    // Personal space pages METADATA ONLY
    queryClient.prefetchQuery({
      queryKey: ['wiki-pages', 'recent', workspaceId, 20, 'personal'],
      queryFn: async () => {
        const response = await fetch('/api/wiki/recent-pages?limit=20&workspace_type=personal')
        if (!response.ok) throw new Error('Failed to fetch personal pages')
        return response.json()
      },
      staleTime: 2 * 60 * 1000,
    }).then(() => console.log('[Prefetch] ✓ Personal pages metadata cached')),

    // Team workspace pages METADATA ONLY
    queryClient.prefetchQuery({
      queryKey: ['wiki-pages', 'recent', workspaceId, 20, 'team'],
      queryFn: async () => {
        const response = await fetch('/api/wiki/recent-pages?limit=20&workspace_type=team')
        if (!response.ok) throw new Error('Failed to fetch team pages')
        return response.json()
      },
      staleTime: 2 * 60 * 1000,
    }).then(() => console.log('[Prefetch] ✓ Team pages metadata cached')),

    // Projects METADATA ONLY
    queryClient.prefetchQuery({
      queryKey: ['projects', workspaceId],
      queryFn: async () => {
        const response = await fetch(`/api/projects?workspaceId=${workspaceId}`)
        if (!response.ok) throw new Error('Failed to fetch projects')
        const data = await response.json()
        return Array.isArray(data) ? data : (data.data || data.projects || [])
      },
      staleTime: 2 * 60 * 1000,
    }).then(() => console.log('[Prefetch] ✓ Projects metadata cached')),

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

        const drafts: any[] = []

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
              excerpt: p.excerpt || '' // Use excerpt, not full content
            }))
          drafts.push(...unpublishedPages)
        }

        if (sessionsRes?.ok) {
          const sessionsData = await sessionsRes.json()
          const draftSessions = (Array.isArray(sessionsData) ? sessionsData : [])
            .filter((s: any) => s.draftTitle && s.draftBody && s.phase !== 'published')
            .map((s: any) => ({
              id: s.id,
              title: s.draftTitle,
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
    }).then(() => console.log('[Prefetch] ✓ Drafts metadata cached')),

    // User status
    queryClient.prefetchQuery({
      queryKey: ['user-status'],
      queryFn: async () => {
        const response = await fetch('/api/auth/user-status')
        if (!response.ok) throw new Error('Failed to fetch user status')
        return response.json()
      },
      staleTime: 30 * 1000,
    }).then(() => console.log('[Prefetch] ✓ User status cached')),
  ]

  // Wait for all prefetches to complete (or fail silently)
  await Promise.allSettled(prefetchPromises)
  
  const duration = Date.now() - startTime
  console.log(`[Prefetch] ✓ All metadata prefetched in ${duration}ms (no full content)`)
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
  if (route === '/wiki/home' || route === '/wiki' || route === '/spaces') {
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
  } else if (route.startsWith('/wiki/team-workspace')) {
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
        const response = await fetch(`/api/projects?workspaceId=${workspaceId}`)
        if (!response.ok) throw new Error('Failed to fetch projects')
        const data = await response.json()
        return Array.isArray(data) ? data : (data.data || data.projects || [])
      },
      staleTime: 2 * 60 * 1000,
    })
  }
}

