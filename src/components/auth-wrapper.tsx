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
  const { data: session, status: sessionStatus, update: updateSession } = useSession({
    required: false, // Don't require session - we'll check manually
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchInterval: 0, // Don't auto-refetch
  })
  const hasRedirected = useRef(false)
  const [showLoader, setShowLoader] = useState(false)
  const loaderStartTime = useRef<number | null>(null)
  const hasShownLoader = useRef(false)
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isNavigatingRef = useRef(false)
  const lastAuthCheckRef = useRef<number>(0)
  const redirectDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Track loader start time and ensure minimum display duration
  const prevPathname = useRef(pathname)
  const hasRedirectedToWelcome = useRef(false)
  
  useEffect(() => {
    const publicRoutes = ['/login', '/welcome', '/api/auth', '/landing', '/about', '/cookie-policy', '/presentation', '/blog']
    const isPublicRoute = pathname === '/' || (pathname && publicRoutes.some(route => pathname.startsWith(route)))
    
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
    const publicRoutes = ['/login', '/welcome', '/api/auth', '/landing', '/about', '/cookie-policy', '/presentation', '/blog']
    const isPublicRoute = pathname === '/' || (pathname && publicRoutes.some(route => pathname.startsWith(route)))
    if (isPublicRoute) {
      return
    }

    // CRITICAL: Check for session cookie FIRST - if it exists, NEVER redirect
    // This prevents false logouts during navigation when useSession() temporarily returns 'unauthenticated'
    const hasSessionCookie = typeof document !== 'undefined' && 
      document.cookie.split(';').some(c => c.trim().startsWith('next-auth.session-token='))
    
    if (hasSessionCookie && sessionStatus === 'unauthenticated') {
      // Cookie exists but useSession says unauthenticated - this is a sync issue, not a logout
      console.log('⚠️ Session cookie exists but useSession() says unauthenticated - waiting for sync (pathname:', pathname, ')')
      // Try to refresh session
      if (updateSession) {
        updateSession().catch(() => {
          // Ignore errors
        })
      }
      // Don't process any redirect logic - cookie is the source of truth
      return
    }

    // Check for logout flag - if set, don't do anything
    if (sessionStorage.getItem('__logout_flag__') === 'true') {
      console.log('🚫 Logout flag detected in AuthWrapper, skipping all auth checks')
      return
    }

    // If navigating between protected routes and session is temporarily unauthenticated,
    // give it a moment to sync before redirecting (prevents false logouts)
    const isNavigatingBetweenProtectedRoutes = prevPathname.current && 
      prevPathname.current !== pathname &&
      !publicRoutes.some(route => prevPathname.current?.startsWith(route)) &&
      !publicRoutes.some(route => pathname?.startsWith(route))
    
    if (isNavigatingBetweenProtectedRoutes && sessionStatus === 'unauthenticated') {
      // Check if we have a session cookie - if yes, wait for sync
      const hasSessionCookie = typeof document !== 'undefined' && 
        document.cookie.split(';').some(c => c.trim().startsWith('next-auth.session-token='))
      if (hasSessionCookie) {
        console.log('⚠️ Navigating between protected routes - session syncing, waiting...')
        // Mark that we're navigating and wait
        isNavigatingRef.current = true
        // Clear any existing timeout
        if (navigationTimeoutRef.current) {
          clearTimeout(navigationTimeoutRef.current)
        }
        // Reset navigation flag after delay
        navigationTimeoutRef.current = setTimeout(() => {
          isNavigatingRef.current = false
          navigationTimeoutRef.current = null
        }, 1000)
        return // Don't redirect yet, wait for session to sync
      }
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

    // Prevent multiple redirects - ONCE we've redirected, don't check again
    // Reset this only on pathname change (user navigates to new route)
    if (hasRedirected.current && prevPathname.current === pathname) {
      return
    }
    
    // Reset redirect flag when pathname changes
    if (prevPathname.current !== pathname) {
      hasRedirected.current = false
      prevPathname.current = pathname
      // Mark that we're navigating
      isNavigatingRef.current = true
      // Clear any existing timeout
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current)
        navigationTimeoutRef.current = null
      }
      // Clear any redirect debounce when navigating
      if (redirectDebounceRef.current) {
        clearTimeout(redirectDebounceRef.current)
        redirectDebounceRef.current = null
      }
      // Reset navigation flag after a longer delay to allow session to sync
      navigationTimeoutRef.current = setTimeout(() => {
        isNavigatingRef.current = false
        navigationTimeoutRef.current = null
      }, 2000) // Increased to 2 seconds to allow session sync
    }

    // IMPORTANT: Wait for session to load before checking
    // This prevents immediate redirect after OAuth callback
    if (sessionStatus === 'loading') {
      // Only log if we haven't redirected yet (first time)
      if (!hasRedirected.current) {
        console.log('⏳ Session loading, waiting...')
      }
      return
    }

    // Check session status first - if unauthenticated, force hard redirect
    // BUT: Add a small delay to prevent race conditions during navigation
    // This prevents false logouts when clicking between pages
    if (sessionStatus === 'unauthenticated') {
      // CRITICAL: ALWAYS check for session cookie FIRST before any redirect
      // useSession() can temporarily return 'unauthenticated' during client-side navigation
      // even when a valid session cookie exists. Cookie is the source of truth.
      const hasSessionCookie = typeof document !== 'undefined' && 
        document.cookie.split(';').some(c => c.trim().startsWith('next-auth.session-token='))
      
      // If we have a session cookie, NEVER redirect - session is syncing
      // This is the most important check - cookie is the source of truth
      if (hasSessionCookie) {
        console.log('⚠️ Session cookie exists - trusting cookie over useSession() during navigation')
        // Clear any pending redirect debounce
        if (redirectDebounceRef.current) {
          clearTimeout(redirectDebounceRef.current)
          redirectDebounceRef.current = null
        }
        // Try to refresh the session to sync it
        if (updateSession) {
          updateSession().catch(() => {
            // Ignore errors - just trying to sync session
          })
        }
        // Don't redirect - session will sync, useSession() will update soon
        return
      }

      // Debounce redirect checks to prevent rapid-fire redirects during navigation
      const now = Date.now()
      const timeSinceLastCheck = now - lastAuthCheckRef.current
      if (timeSinceLastCheck < 500) {
        // Too soon since last check - debounce
        if (redirectDebounceRef.current) {
          clearTimeout(redirectDebounceRef.current)
        }
        redirectDebounceRef.current = setTimeout(() => {
          lastAuthCheckRef.current = Date.now()
          // Re-check after debounce
          if (sessionStatus === 'unauthenticated' && !hasRedirected.current) {
            const stillNoCookie = typeof document !== 'undefined' && 
              !document.cookie.split(';').some(c => c.trim().startsWith('next-auth.session-token='))
            if (stillNoCookie) {
              console.log('No session cookie found after debounce, forcing redirect to login')
              hasRedirected.current = true
              window.location.href = '/login'
            }
          }
        }, 500)
        return
      }
      lastAuthCheckRef.current = now

      // If we're in the middle of navigation, wait before checking
      if (isNavigatingRef.current) {
        console.log('⚠️ Navigating - waiting for session to sync...')
        return
      }
      
      // If pathname just changed (we navigated), give it more time
      // NextAuth can take a moment to sync session after navigation
      // CRITICAL: Always check cookie first, even if pathname changed
      if (prevPathname.current !== pathname) {
        console.log('⚠️ Pathname changed - checking session cookie before any redirect...')
        // Double-check cookie - it might have been set during navigation
        const cookieAfterNav = typeof document !== 'undefined' && 
          document.cookie.split(';').some(c => c.trim().startsWith('next-auth.session-token='))
        if (cookieAfterNav) {
          console.log('✅ Session cookie found after navigation - allowing page to load')
          return // Cookie exists, don't redirect
        }
        
        // No cookie found, but wait longer for session sync
        const timeoutKey = `__nav_auth_check_${pathname}__`
        if (!sessionStorage.getItem(timeoutKey)) {
          sessionStorage.setItem(timeoutKey, 'true')
          setTimeout(() => {
            sessionStorage.removeItem(timeoutKey)
            if (!hasRedirected.current) {
              // Re-check cookie after delay
              const stillNoCookie = typeof document !== 'undefined' && 
                !document.cookie.split(';').some(c => c.trim().startsWith('next-auth.session-token='))
              if (stillNoCookie) {
                console.log('No session cookie found after navigation delay, forcing redirect to login')
                hasRedirected.current = true
                window.location.href = '/login'
              } else {
                console.log('Session cookie found after delay - session synced, allowing navigation')
              }
            }
          }, 2000) // Longer delay for navigation - give NextAuth time to sync
        }
        return
      }
      
      // No session cookie, not navigating, pathname hasn't changed - truly unauthenticated
      console.log('No session found, forcing redirect to login')
      hasRedirected.current = true
      window.location.href = '/login'
      return
    }

    // Only redirect if we have user status data and loading is complete and session is authenticated
    // Skip logging unless there's an actual issue to reduce console noise
    if (!loading && userStatus && sessionStatus === 'authenticated') {
      // IMPORTANT: If session is authenticated, trust it even if userStatus.isAuthenticated is false
      // This prevents false negatives from API errors (e.g., Prisma failures, DB connection issues)
      // The session check above already confirmed the user is authenticated, so we trust that
      if (!userStatus.isAuthenticated) {
        // Session is authenticated but userStatus says not authenticated - likely API error
        // Log warning but don't redirect - trust the session
        console.warn('[AuthWrapper] Session authenticated but userStatus.isAuthenticated is false. This may be due to a temporary API error (e.g., getAuthUser() failed). Allowing access based on session.')
        // Continue with other checks - don't redirect
      }
      
      // HARD STOP: Check if redirects are stopped FIRST - before any other checks
      if (sessionStorage.getItem('__redirect_stopped__') === 'true') {
        console.log('[AuthWrapper] Redirects stopped, allowing page to load')
        return
      }
      
      // Check redirect counter - if too many, stop immediately
      const redirectCount = parseInt(sessionStorage.getItem('__redirect_count__') || '0')
      if (redirectCount >= 2) {
        console.log('[AuthWrapper] Redirect limit reached, stopping redirects')
        sessionStorage.setItem('__redirect_stopped__', 'true')
        sessionStorage.setItem('__workspace_id__', 'ws_1765020555_4662b211')
        sessionStorage.setItem('__has_workspace__', 'true')
        return
      }
      
      // Check for workspace deletion error or missing workspace
      if (userStatus.error && userStatus.error.includes('No workspace found')) {
        // Workspace was deleted or user has no workspace, redirect to welcome
        console.log('[AuthWrapper] No workspace found (error), redirecting to welcome')
        sessionStorage.setItem('__redirect_count__', (redirectCount + 1).toString())
        hasRedirected.current = true
        window.location.href = '/welcome'
        return
      }
      
      if (userStatus.isFirstTime || !userStatus.workspaceId) {
        // First-time user or no workspace, redirect to welcome
        console.log('[AuthWrapper] No workspace found (isFirstTime:', userStatus.isFirstTime, 'workspaceId:', userStatus.workspaceId,'), redirecting to welcome')
        sessionStorage.setItem('__redirect_count__', (redirectCount + 1).toString())
        hasRedirected.current = true
        window.location.href = '/welcome'
        return
      }
    }

    // Cleanup function to clear timeouts
    return () => {
      if (redirectDebounceRef.current) {
        clearTimeout(redirectDebounceRef.current)
        redirectDebounceRef.current = null
      }
    }
  }, [router, pathname, userStatus, loading, sessionStatus])

  // Show loading only if we're on a protected route
  const publicRoutes = ['/login', '/welcome', '/api/auth', '/landing', '/about', '/cookie-policy', '/presentation', '/blog']
  const isPublicRoute = pathname === '/' || (pathname && publicRoutes.some(route => pathname.startsWith(route)))
  
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
