'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useUserStatusContext } from '@/providers/user-status-provider'
import { useSession } from 'next-auth/react'
import { LoadingInitializer } from '@/components/auth/loading-initializer'
import { isPublicRoute } from '@/lib/redirect-handler'

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
  const isPublic = isPublicRoute(pathname)
  
  // PHASE B2: Removed skip loader flag - loader shows based on loading state only
  const skipLoaderFlag = false
  
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
