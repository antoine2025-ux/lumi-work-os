"use client"

import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { useUserStatusContext } from '@/providers/user-status-provider'
import { prefetchRoute, prefetchPageContent } from '@/lib/prefetch'
import { useCallback } from 'react'

interface PrefetchLinkProps extends React.ComponentProps<typeof Link> {
  children: React.ReactNode
  prefetchOnHover?: boolean
  pageIdOrSlug?: string // If this is a page link, provide the ID/slug to prefetch content
}

/**
 * Link component that prefetches data on hover
 * This ensures data is ready when users click
 * 
 * OPTIMIZED: Only prefetches metadata for routes, and full content for specific pages
 */
export function PrefetchLink({ 
  href, 
  children, 
  prefetchOnHover = true,
  pageIdOrSlug,
  ...props 
}: PrefetchLinkProps) {
  const queryClient = useQueryClient()
  // Use centralized UserStatusContext - no separate API call needed
  const { workspaceId } = useUserStatusContext()

  const handleMouseEnter = useCallback(() => {
    if (!prefetchOnHover || !workspaceId || typeof href !== 'string') return

    // If this is a specific page link, prefetch the page content (the "most likely next" page)
    if (pageIdOrSlug && href.startsWith('/wiki/') && href !== '/wiki/home') {
      // Extract slug from href if not provided
      const slug = pageIdOrSlug || href.replace('/wiki/', '')
      prefetchPageContent(slug, queryClient)
    } else {
      // Otherwise, prefetch route metadata
      prefetchRoute(href, queryClient, workspaceId)
    }
  }, [href, prefetchOnHover, workspaceId, queryClient, pageIdOrSlug])

  return (
    <Link
      href={href}
      onMouseEnter={handleMouseEnter}
      {...props}
    >
      {children}
    </Link>
  )
}

