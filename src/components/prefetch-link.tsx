"use client"

import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { useUserStatus } from '@/hooks/use-user-status'
import { prefetchRoute } from '@/lib/prefetch'
import { useCallback } from 'react'

interface PrefetchLinkProps extends React.ComponentProps<typeof Link> {
  children: React.ReactNode
  prefetchOnHover?: boolean
}

/**
 * Link component that prefetches data on hover
 * This ensures data is ready when users click
 */
export function PrefetchLink({ 
  href, 
  children, 
  prefetchOnHover = true,
  ...props 
}: PrefetchLinkProps) {
  const queryClient = useQueryClient()
  const { userStatus } = useUserStatus()

  const handleMouseEnter = useCallback(() => {
    if (prefetchOnHover && userStatus?.workspaceId && typeof href === 'string') {
      // Prefetch data for this route
      prefetchRoute(href, queryClient, userStatus.workspaceId)
    }
  }, [href, prefetchOnHover, userStatus?.workspaceId, queryClient])

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

