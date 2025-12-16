"use client"

import React, { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { prefetchAllData } from '@/lib/prefetch'
import { useUserStatus } from '@/hooks/use-user-status'

/**
 * Aggressive data prefetcher component
 * Runs immediately when the app loads to warm up the cache
 * This ensures all data is ready before users navigate
 */
export function DataPrefetcher() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const { userStatus } = useUserStatus()
  const pathname = usePathname()
  const hasPrefetched = useRef(false)

  useEffect(() => {
    // Skip prefetching on public routes (blog, landing, etc.)
    const publicRoutes = ['/blog', '/landing', '/about', '/cookie-policy', '/presentation', '/login', '/welcome']
    const isPublicRoute = pathname && publicRoutes.some(route => pathname.startsWith(route))
    
    if (isPublicRoute) {
      return // Don't prefetch on public routes
    }

    // Only prefetch once per session
    if (hasPrefetched.current) return
    
    // Wait for authentication and workspace
    if (session?.user && userStatus?.workspaceId) {
      hasPrefetched.current = true
      
      // Start prefetching immediately - don't block rendering
      // This runs in the background while the user sees the UI
      prefetchAllData({
        workspaceId: userStatus.workspaceId,
        queryClient,
      }).catch((error) => {
        console.error('[DataPrefetcher] Prefetch error:', error)
        // Don't throw - prefetching failures shouldn't break the app
      })
    }
  }, [session?.user, userStatus?.workspaceId, queryClient, pathname])

  // Also prefetch when workspace changes (e.g., user switches workspace)
  useEffect(() => {
    if (userStatus?.workspaceId && hasPrefetched.current) {
      // Reset flag to allow prefetching for new workspace
      hasPrefetched.current = false
    }
  }, [userStatus?.workspaceId])

  return null // This component doesn't render anything
}

