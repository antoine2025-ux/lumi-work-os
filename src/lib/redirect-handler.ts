/**
 * Centralized redirect handler
 * 
 * This module consolidates all redirect logic to prevent infinite loops
 * and provide a single source of truth for navigation decisions.
 */

import { Session } from 'next-auth'

export interface RedirectContext {
  session: Session | null
  sessionStatus: 'loading' | 'authenticated' | 'unauthenticated'
  workspaceId: string | null
  isFirstTime: boolean
  pendingInvite: { token: string } | null
  pathname: string
  isLoading: boolean
  error: string | null
}

export interface RedirectDecision {
  shouldRedirect: boolean
  target?: string
  reason?: string
}

/**
 * Determines if a route is public (doesn't require authentication)
 */
export function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    '/login',
    '/welcome',
    '/api/auth',
    '/landing',
    '/about',
    '/cookie-policy',
    '/presentation',
    '/blog',
  ]
  
  return pathname === '/' || publicRoutes.some(route => pathname.startsWith(route))
}

/**
 * Determines if a route is an invite route
 */
export function isInviteRoute(pathname: string): boolean {
  return pathname.startsWith('/invites') || pathname === '/invites'
}

/**
 * Determines if a route should never trigger redirects (special cases)
 */
export function shouldNeverRedirect(pathname: string): boolean {
  // People page has special handling - never redirect from it
  return pathname === '/org/people'
}

/**
 * Main redirect decision logic
 * 
 * Returns a decision object indicating whether to redirect and where.
 * This is the single source of truth for all redirect logic.
 */
export function getRedirectDecision(context: RedirectContext): RedirectDecision {
  const { session, sessionStatus, workspaceId, isFirstTime, pendingInvite, pathname, isLoading, error } = context

  // 1. Never redirect from special routes
  if (shouldNeverRedirect(pathname)) {
    return { shouldRedirect: false, reason: 'Special route - never redirect' }
  }

  // 2. Public routes don't need redirects
  if (isPublicRoute(pathname)) {
    return { shouldRedirect: false, reason: 'Public route' }
  }

  // 3. Invite routes have their own flow
  if (isInviteRoute(pathname)) {
    return { shouldRedirect: false, reason: 'Invite route' }
  }

  // 4. Wait for session to load
  if (sessionStatus === 'loading' || isLoading) {
    return { shouldRedirect: false, reason: 'Still loading' }
  }

  // Commented to fix issue with pages redirects
  // // 5. Unauthenticated users go to login
  // if (sessionStatus === 'unauthenticated' || !session) {
  //   const loginUrl = `/login?callbackUrl=${encodeURIComponent(pathname)}`
  //   return { shouldRedirect: true, target: loginUrl, reason: 'Not authenticated' }
  // }

  // 6. Authenticated but no workspace - ONLY redirect if we're certain there's no workspace
  // Don't redirect if workspaceId is null but we're still loading or haven't confirmed no workspace
  if (!workspaceId) {
    // If there's a pending invite, redirect to accept it
    if (pendingInvite?.token) {
      return {
        shouldRedirect: true,
        target: `/invites/${pendingInvite.token}`,
        reason: 'Pending invite exists',
      }
    }

    // Only redirect to welcome if we're CERTAIN there's no workspace:
    // - User is marked as first-time (definitely no workspace)
    // - There's an explicit error saying no workspace found
    // - We're NOT still loading (to avoid redirecting during initial load)
    if (!isLoading && (isFirstTime || error?.includes('No workspace found'))) {
      return { shouldRedirect: true, target: '/welcome', reason: 'No workspace found' }
    }
    
    // If workspaceId is null but we're still loading or haven't confirmed no workspace,
    // don't redirect yet - wait for the API call to complete
    if (isLoading) {
      return { shouldRedirect: false, reason: 'Waiting for workspace to load' }
    }
  }

  // 7. All checks passed - no redirect needed
  return { shouldRedirect: false, reason: 'All checks passed' }
}

/**
 * Checks if user has a valid session cookie
 * This is a fallback when useSession() might be temporarily out of sync
 */
export function hasSessionCookie(): boolean {
  if (typeof document === 'undefined') return false
  
  return document.cookie
    .split(';')
    .some(c => c.trim().startsWith('next-auth.session-token='))
}

/**
 * Enhanced redirect decision that accounts for session cookie
 * Use this when useSession() might be temporarily out of sync during navigation
 */
export function getRedirectDecisionWithCookie(context: RedirectContext): RedirectDecision {
  // If we have a session cookie but useSession says unauthenticated,
  // it's likely a sync issue - don't redirect yet
  if (context.sessionStatus === 'unauthenticated' && hasSessionCookie()) {
    return { shouldRedirect: false, reason: 'Session cookie exists - waiting for sync' }
  }

  return getRedirectDecision(context)
}
