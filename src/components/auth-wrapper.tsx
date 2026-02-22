'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useUserStatusContext } from '@/providers/user-status-provider'
import { useSession } from 'next-auth/react'
import { LoadingInitializer } from '@/components/auth/loading-initializer'
import { isPublicRoute } from '@/lib/redirect-handler'

interface AuthWrapperProps {
  children: React.ReactNode
}

export function AuthWrapper({ children }: AuthWrapperProps) {
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
  const { data: session, status: sessionStatus } = useSession({
    required: false, // Don't require session - we'll check manually
  })
  const [_showLoader, setShowLoader] = useState(false)
  const hasShownLoader = useRef(false)
  
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
    
    // PHASE B2: Removed skip loader flag - loader shows based on loading state only
    
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

  // PHASE C2: Removed workspace redirect logic - middleware handles all redirects now
  // Keep only loading state management

  // Show loading only if we're on a protected route
  
  // PHASE B2: Removed skip loader flag - loader shows based on loading state only
  
  // Skip loader if user has no workspace (will redirect to /welcome)
  // Only check this if userStatus is actually loaded (not undefined)
  
  // Only show loader for authenticated users with workspaces who are loading
  // Don't show if: on public route, skipping, redirecting to welcome, or don't have workspace yet
  
  // Never show loader after first authentication
  const shouldShowLoader = false // Always false - loader disabled for reloads
  
  if (shouldShowLoader) {
    return <LoadingInitializer />
  }

  return <>{children}</>
}
