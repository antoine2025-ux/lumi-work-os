'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useUserStatusContext } from '@/providers/user-status-provider'
import { useSession } from 'next-auth/react'
import { LoadingInitializer } from '@/components/auth/loading-initializer'
import { getRedirectDecisionWithCookie, isPublicRoute } from '@/lib/redirect-handler'

interface AuthWrapperProps {
  children: React.ReactNode
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const router = useRouter()
  const pathname = usePathname()
  // Use centralized UserStatusContext - no separate API call needed
  const userStatusCtx = useUserStatusContext()
  const userStatus = {
    isAuthenticated: userStatusCtx.isAuthenticated,
    isFirstTime: userStatusCtx.isFirstTime,
    workspaceId: userStatusCtx.workspaceId,
    error: userStatusCtx.error,
    pendingInvite: userStatusCtx.pendingInvite,
  }
  const loading = userStatusCtx.isLoading
  const error = userStatusCtx.error
  const { data: session, status: sessionStatus, update: updateSession } = useSession({
    required: false, // Don't require session - we'll check manually
  })
  const hasRedirected = useRef(false)
  const [showLoader, setShowLoader] = useState(false)
  const hasShownLoader = useRef(false)
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    // Skip loader logic if we're on public routes
    if (isPublicRoute(pathname)) {
      setShowLoader(false)
      return
    }
    
    // Skip loader if we've already shown it during this session
    if (hasShownLoader.current) {
      setShowLoader(false)
      return
    }
    
    // Check if we should skip loader (after workspace creation)
    if (sessionStorage.getItem('__skip_loader__') === 'true') {
      sessionStorage.removeItem('__skip_loader__')
      setShowLoader(false)
      hasShownLoader.current = true
      return
    }
    
    // If user doesn't have a workspace and we're about to redirect to welcome, don't show loader
    if (userStatus && (userStatus.isFirstTime || !userStatus.workspaceId)) {
      setShowLoader(false)
      return
    }
    
    // Only show loader on the very first load when authenticating
    if (!loading && sessionStatus === 'authenticated' && !hasShownLoader.current) {
      hasShownLoader.current = true
      setShowLoader(false)
    }
  }, [loading, sessionStatus, pathname, userStatus, session])

  const prevPathname = useRef(pathname)

  useEffect(() => {
    // Reset redirect flag when pathname changes (user navigated to new route)
    if (prevPathname.current !== pathname) {
      hasRedirected.current = false
      prevPathname.current = pathname
    }

    // Skip if already redirected for this pathname
    if (hasRedirected.current) {
      return
    }

    // Use centralized redirect handler
    const decision = getRedirectDecisionWithCookie({
      session,
      sessionStatus,
      workspaceId: userStatus?.workspaceId || null,
      isFirstTime: userStatus?.isFirstTime || false,
      pendingInvite: userStatus?.pendingInvite || null,
      pathname,
      isLoading: loading,
      error: userStatus?.error || null,
    })

    if (decision.shouldRedirect && decision.target) {
      // Clear any existing timeout
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }

      // Small delay to prevent rapid redirects during navigation
      redirectTimeoutRef.current = setTimeout(() => {
        hasRedirected.current = true
        window.location.href = decision.target!
      }, 100)
    }

    // Cleanup
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
        redirectTimeoutRef.current = null
      }
    }
  }, [session, sessionStatus, userStatus, pathname, loading])

  // Show loading only if we're on a protected route
  const isPublic = isPublicRoute(pathname)
  
  // Skip loader if flag is set (after workspace creation)
  const skipLoaderFlag = typeof window !== 'undefined' && (
    sessionStorage.getItem('__skip_loader__') === 'true' || 
    sessionStorage.getItem('__workspace_just_created__') === 'true'
  )
  
  // Skip loader if user has no workspace (will redirect to /welcome)
  // Only check this if userStatus is actually loaded (not undefined)
  const willRedirectToWelcome = !loading && userStatus && (userStatus.isFirstTime || !userStatus.workspaceId)
  
  // Only show loader for authenticated users with workspaces who are loading
  // Don't show if: on public route, skipping, redirecting to welcome, or don't have workspace yet
  const userHasWorkspace = !loading && userStatus && userStatus.workspaceId
  const isAuthenticated = sessionStatus === 'authenticated'
  const isUserDataLoading = loading || showLoader
  
  // Never show loader after first authentication
  const shouldShowLoader = false // Always false - loader disabled for reloads
  
  if (shouldShowLoader) {
    return <LoadingInitializer />
  }

  return <>{children}</>
}
