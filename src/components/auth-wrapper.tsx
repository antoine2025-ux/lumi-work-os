'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useUserStatus } from '@/hooks/use-user-status'
import { useSession } from 'next-auth/react'
import { LoadingInitializer } from '@/components/auth/loading-initializer'

interface AuthWrapperProps {
  children: React.ReactNode
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { userStatus, loading } = useUserStatus()
  const { data: session, status: sessionStatus } = useSession()
  const hasRedirected = useRef(false)
  const [showLoader, setShowLoader] = useState(false)
  const loaderStartTime = useRef<number | null>(null)
  const hasShownLoader = useRef(false)

  // Track loader start time and ensure minimum display duration
  const prevPathname = useRef(pathname)
  const hasRedirectedToWelcome = useRef(false)
  
  useEffect(() => {
    const publicRoutes = ['/login', '/welcome', '/api/auth']
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
    
    // Skip loader logic if we're on public routes or welcome page
    if (isPublicRoute) {
      setShowLoader(false)
      if (pathname === '/welcome') {
        hasRedirectedToWelcome.current = true
      }
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
      hasShownLoader.current = true // Mark as shown to prevent it in the future
      return
    }
    
    // If user doesn't have a workspace and we're about to redirect to welcome, don't show loader
    if (userStatus && (userStatus.isFirstTime || !userStatus.workspaceId)) {
      setShowLoader(false)
      return
    }
    
    // Only show loader on the very first load when authenticating
    if (!loading && sessionStatus === 'authenticated' && !hasShownLoader.current) {
      // Mark as shown immediately - don't show loader for this session anymore
      hasShownLoader.current = true
      setShowLoader(false)
    }
  }, [loading, sessionStatus, pathname, userStatus, session])

  useEffect(() => {
    // Skip auth check for public routes - RETURN EARLY, don't process anything
    const publicRoutes = ['/login', '/welcome', '/api/auth']
    if (publicRoutes.some(route => pathname.startsWith(route))) {
      return
    }

    // Check for logout flag - if set, don't do anything
    if (sessionStorage.getItem('__logout_flag__') === 'true') {
      console.log('🚫 Logout flag detected in AuthWrapper, skipping all auth checks')
      return
    }

    // Check for skip loader flag (after workspace creation) - don't redirect to welcome
    if (sessionStorage.getItem('__skip_loader__') === 'true' || sessionStorage.getItem('__workspace_just_created__') === 'true') {
      console.log('🚫 Skip loader/workspace just created flag detected, skipping welcome redirect check')
      // Clear the flags after delay to ensure redirect completes and workspace loads
      setTimeout(() => {
        sessionStorage.removeItem('__skip_loader__')
        sessionStorage.removeItem('__workspace_just_created__')
      }, 3000) // 3 seconds should be enough for workspace to load
      return
    }

    // Prevent multiple redirects
    if (hasRedirected.current) {
      return
    }

    // IMPORTANT: Wait for session to load before checking
    // This prevents immediate redirect after OAuth callback
    if (sessionStatus === 'loading') {
      console.log('⏳ Session loading, waiting...')
      return
    }

    // Check session status first - if unauthenticated, force hard redirect
    if (sessionStatus === 'unauthenticated') {
      console.log('No session found, forcing redirect to login')
      hasRedirected.current = true
      window.location.href = '/login'
      return
    }

    // Only redirect if we have user status data and loading is complete and session is authenticated
    console.log('[AuthWrapper] Status check:', { 
      loading, 
      userStatus: userStatus ? JSON.stringify(userStatus) : null, 
      sessionStatus 
    })
    
    if (!loading && userStatus && sessionStatus === 'authenticated') {
      if (!userStatus.isAuthenticated) {
        // Not authenticated, redirect to login
        console.log('[AuthWrapper] User not authenticated, forcing redirect to login')
        hasRedirected.current = true
        window.location.href = '/login'
        return
      }
      
      // Check for workspace deletion error or missing workspace
      if (userStatus.error && userStatus.error.includes('No workspace found')) {
        // Workspace was deleted or user has no workspace, redirect to welcome
        console.log('[AuthWrapper] No workspace found (error), redirecting to welcome')
        hasRedirected.current = true
        window.location.href = '/welcome'
        return
      }
      
      if (userStatus.isFirstTime || !userStatus.workspaceId) {
        // First-time user or no workspace, redirect to welcome
        console.log('[AuthWrapper] No workspace found (isFirstTime:', userStatus.isFirstTime, 'workspaceId:', userStatus.workspaceId,'), redirecting to welcome')
        hasRedirected.current = true
        window.location.href = '/welcome'
        return
      }
    }
  }, [router, pathname, userStatus, loading, sessionStatus])

  // Show loading only if we're on a protected route
  const publicRoutes = ['/login', '/welcome', '/api/auth']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
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
