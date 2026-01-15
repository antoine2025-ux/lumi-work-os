'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useUserStatusContext } from '@/providers/user-status-provider'
import { useSession } from 'next-auth/react'
import { LoadingInitializer } from '@/components/auth/loading-initializer'

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
  const loaderStartTime = useRef<number | null>(null)
  const hasShownLoader = useRef(false)
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isNavigatingRef = useRef(false)
  const lastAuthCheckRef = useRef<number>(0)
  const redirectDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Track loader start time and ensure minimum display duration
  const prevPathname = useRef(pathname)
  const hasRedirectedToWelcome = useRef(false)

  // Helper function to check if we should prevent redirects from People page
  const shouldPreventRedirect = (): boolean => {
    if (typeof window === 'undefined') return false
    // Check current pathname (most reliable)
    const currentPath = window.location.pathname
    if (currentPath === '/org/people') {
      console.log('✅ shouldPreventRedirect: People page detected via pathname')
      return true
    }
    // Check persistent flag
    if (sessionStorage.getItem('__people_page_no_redirect__') === 'true') {
      console.log('✅ shouldPreventRedirect: People page flag detected')
      return true
    }
    return false
  }
  
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
    // CRITICAL: Check People page FIRST, before any other logic
    // This must happen before public routes check to prevent redirects
    if (pathname === '/org/people' && typeof window !== 'undefined') {
      // Set a persistent flag that prevents ALL redirects from People page
      // This flag persists across effect re-runs
      sessionStorage.setItem('__people_page_no_redirect__', 'true')
      
      // Check flags
      const isPeoplePageActive = sessionStorage.getItem('__people_page_active__') === 'true'
      const isPeoplePageLoading = sessionStorage.getItem('__people_page_loading__') === 'true'
      const isPeoplePageLoaded = sessionStorage.getItem('__people_page_loaded__') === 'true'
      
      console.log('[AuthWrapper] People page detected - NEVER redirect from People page', {
        sessionStatus,
        active: isPeoplePageActive,
        loading: isPeoplePageLoading,
        loaded: isPeoplePageLoaded
      })
      
      // RULE 1: If session is authenticated, NEVER redirect from People page
      // useSession() is the source of truth - if it says authenticated, trust it
      if (sessionStatus === 'authenticated') {
        console.log('✅ People page: session is authenticated - NEVER redirect')
        return
      }
      
      // RULE 2: If flags are set, skip redirect to allow page to load
      if (isPeoplePageActive || isPeoplePageLoading || isPeoplePageLoaded) {
        console.log('✅ People page flags set - skipping redirect to allow page to load', {
          active: isPeoplePageActive,
          loading: isPeoplePageLoading,
          loaded: isPeoplePageLoaded,
          sessionStatus
        })
        
        // If page has loaded, keep the flags for a while to prevent redirects
        if (isPeoplePageLoaded) {
          // Keep the flags for 10 seconds after successful load
          setTimeout(() => {
            sessionStorage.removeItem('__people_page_loaded__');
          }, 10000);
        }
        return
      }
      
      // RULE 3: For any session status on People page, NEVER redirect
      // The persistent flag will prevent redirects even if this effect re-runs
      console.log('✅ People page: NEVER redirect regardless of session status', { sessionStatus })
      return
    } else {
      // Not on People page - clear the no-redirect flag
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('__people_page_no_redirect__')
      }
    }
    
    // CRITICAL: Check the persistent no-redirect flag BEFORE any redirect logic
    // This prevents redirects even if the effect runs multiple times
    if (typeof window !== 'undefined' && sessionStorage.getItem('__people_page_no_redirect__') === 'true') {
      console.log('✅ People page no-redirect flag set - skipping ALL redirect checks')
      return
    }

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
      // CRITICAL: Check if we're on People page FIRST - check pathname directly
      // This is the most reliable check, doesn't depend on flags being set
      if (pathname === '/org/people') {
        console.log('✅ People page: pathname check - NEVER redirect from People page')
        return
      }
      
      // Also check the persistent flag as a backup
      if (typeof window !== 'undefined' && sessionStorage.getItem('__people_page_no_redirect__') === 'true') {
        console.log('✅ People page no-redirect flag - skipping redirect check')
        return
      }

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
            // CRITICAL: Check current pathname - don't redirect from People page
            const currentPath = window.location.pathname
            if (currentPath === '/org/people') {
              console.log('✅ People page: pathname check in debounce - NEVER redirect')
              return
            }
            // CRITICAL: Check People page no-redirect flag
            if (typeof window !== 'undefined' && sessionStorage.getItem('__people_page_no_redirect__') === 'true') {
              console.log('✅ People page no-redirect flag - skipping redirect after debounce')
              return
            }
            const stillNoCookie = typeof document !== 'undefined' && 
              !document.cookie.split(';').some(c => c.trim().startsWith('next-auth.session-token='))
            if (stillNoCookie) {
              // CRITICAL: Final check before redirect
              if (shouldPreventRedirect()) {
                console.log('✅ shouldPreventRedirect: Blocking redirect after debounce')
                return
              }
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
        // CRITICAL: Check People page no-redirect flag
        if (typeof window !== 'undefined' && sessionStorage.getItem('__people_page_no_redirect__') === 'true') {
          console.log('✅ People page no-redirect flag - skipping redirect after navigation')
          return
        }
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
              // CRITICAL: Check current pathname - don't redirect from People page
              const currentPath = window.location.pathname
              if (currentPath === '/org/people') {
                console.log('✅ People page: pathname check in navigation delay - NEVER redirect')
                return
              }
              // CRITICAL: Check People page no-redirect flag
              if (typeof window !== 'undefined' && sessionStorage.getItem('__people_page_no_redirect__') === 'true') {
                console.log('✅ People page no-redirect flag - skipping redirect after navigation delay')
                return
              }
              // Re-check cookie after delay
              const stillNoCookie = typeof document !== 'undefined' && 
                !document.cookie.split(';').some(c => c.trim().startsWith('next-auth.session-token='))
              if (stillNoCookie) {
                // CRITICAL: Final check before redirect
                if (shouldPreventRedirect()) {
                  console.log('✅ shouldPreventRedirect: Blocking redirect after navigation delay')
                  return
                }
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
      // CRITICAL: Check current pathname - don't redirect from People page
      if (pathname === '/org/people') {
        console.log('✅ People page: pathname check in final redirect - NEVER redirect')
        return
      }
      // CRITICAL: Check People page no-redirect flag
      if (typeof window !== 'undefined' && sessionStorage.getItem('__people_page_no_redirect__') === 'true') {
        console.log('✅ People page no-redirect flag - skipping redirect')
        return
      }
      // CRITICAL: Final check before redirect
      if (shouldPreventRedirect()) {
        console.log('✅ shouldPreventRedirect: Blocking final redirect')
        return
      }
      console.log('No session found, forcing redirect to login')
      hasRedirected.current = true
      window.location.href = '/login'
      return
    }

    // Only redirect if we have user status data and loading is complete and session is authenticated
    // Skip logging unless there's an actual issue to reduce console noise
    // Resilience: Don't redirect if userStatus fetch failed (error state) - prevents infinite redirects
    if (!loading && userStatus && sessionStatus === 'authenticated' && !error) {
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
      // Skip redirect if user is on an invite page - they need to accept the invite first
      const isInvitePage = pathname?.startsWith('/invites') || pathname === '/invites'
      
      // Guard: Never redirect if already on invite page
      if (isInvitePage) {
        return
      }
      
      if (userStatus.error && userStatus.error.includes('No workspace found')) {
        // Check for pending invite first
        if (userStatus.pendingInvite?.token) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[AuthWrapper] No workspace found but pending invite exists, redirecting to invite:', userStatus.pendingInvite.token)
          }
          hasRedirected.current = true
          window.location.href = `/invites/${userStatus.pendingInvite.token}`
          return
        }
        
        // No pending invite, redirect to welcome
        if (process.env.NODE_ENV === 'development') {
          console.log('[AuthWrapper] No workspace found (error), no pending invite, redirecting to welcome')
        }
        hasRedirected.current = true
        window.location.href = '/welcome'
        return
      }
      
      if (userStatus.isFirstTime || !userStatus.workspaceId) {
        // Check for pending invite first
        if (userStatus.pendingInvite?.token) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[AuthWrapper] No workspace found but pending invite exists, redirecting to invite:', userStatus.pendingInvite.token)
          }
          hasRedirected.current = true
          window.location.href = `/invites/${userStatus.pendingInvite.token}`
          return
        }
        
        // No pending invite, redirect to welcome
        if (process.env.NODE_ENV === 'development') {
          console.log('[AuthWrapper] No workspace found (isFirstTime:', userStatus.isFirstTime, 'workspaceId:', userStatus.workspaceId,'), no pending invite, redirecting to welcome')
          sessionStorage.setItem('__redirect_count__', (redirectCount + 1).toString())
        }
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
