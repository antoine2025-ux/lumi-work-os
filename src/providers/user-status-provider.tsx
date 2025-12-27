"use client"

import React, { createContext, useContext, useMemo, useEffect, useRef, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'

/**
 * User status data - single source of truth for auth state
 * Combines session data with optional API fallback
 */
export interface UserStatus {
  isAuthenticated: boolean
  isLoading: boolean
  isFirstTime: boolean
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
  } | null
  workspaceId: string | null
  role: string | null
  isDevelopment: boolean
  error?: string | null
  pendingInvite?: {
    token: string
    workspace: {
      slug: string
      name: string
    }
  } | null
}

interface UserStatusContextType extends UserStatus {
  refetch: () => Promise<void>
}

const UserStatusContext = createContext<UserStatusContextType | undefined>(undefined)

/**
 * Hook to access user status from context
 * This is the recommended way to get user/workspace data across the app
 */
export function useUserStatusContext(): UserStatusContextType {
  const context = useContext(UserStatusContext)
  if (context === undefined) {
    throw new Error('useUserStatusContext must be used within a UserStatusProvider')
  }
  return context
}

interface UserStatusProviderProps {
  children: ReactNode
}

/**
 * UserStatusProvider - Single source of truth for authentication state
 * 
 * This provider reads workspace data directly from the NextAuth session JWT,
 * eliminating the need for repeated /api/auth/user-status API calls.
 * 
 * It only fetches from API as a fallback when:
 * - Session is authenticated but missing workspace data (legacy tokens)
 * - After workspace switch to get updated data
 * 
 * This significantly reduces page load time by avoiding 3-5 redundant API calls.
 */
export function UserStatusProvider({ children }: UserStatusProviderProps) {
  const { data: session, status, update: updateSession } = useSession()
  
  // Determine if we need to fetch from API (fallback for legacy tokens)
  // Only fetch if authenticated but session is missing workspace data
  const shouldFetchFromApi = useMemo(() => {
    if (status !== 'authenticated') return false
    if (!session?.user) return false
    // If session has workspace data, no need to fetch
    if (session.user.workspaceId !== undefined) return false
    return true
  }, [status, session?.user])

  // Fallback API fetch - only when session is missing workspace data
  const { data: apiStatus, isLoading: isApiFetching, refetch: apiRefetch } = useQuery({
    queryKey: ['user-status-fallback'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user-status', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      return response.json()
    },
    enabled: shouldFetchFromApi,
    staleTime: 5 * 60 * 1000, // 5 minutes - workspace changes rarely
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  })

  // Combine session data with API fallback
  const userStatus = useMemo<UserStatusContextType>(() => {
    const isLoading = status === 'loading' || (shouldFetchFromApi && isApiFetching)
    const isAuthenticated = status === 'authenticated'
    
    // Prefer session data, fall back to API data
    const workspaceId = session?.user?.workspaceId || apiStatus?.workspaceId || null
    const role = session?.user?.role || apiStatus?.role || null
    const isFirstTime = session?.user?.isFirstTime ?? apiStatus?.isFirstTime ?? false
    
    const user = session?.user ? {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    } : apiStatus?.user || null

    return {
      isAuthenticated,
      isLoading,
      isFirstTime,
      user,
      workspaceId,
      role,
      isDevelopment: typeof process !== 'undefined' && process.env?.NODE_ENV === 'development',
      error: apiStatus?.error || null,
      pendingInvite: apiStatus?.pendingInvite || null,
      refetch: async () => {
        // Trigger session update to refresh JWT
        await updateSession()
        // Also refetch API if we're using fallback
        if (shouldFetchFromApi) {
          await apiRefetch()
        }
      }
    }
  }, [status, session, apiStatus, isApiFetching, shouldFetchFromApi, updateSession, apiRefetch])

  // Auto-capture user's timezone from browser (once)
  const timezoneCapturedRef = useRef(false)
  
  useEffect(() => {
    // Only run once, when user is authenticated and we have a user ID
    if (!userStatus.isAuthenticated || !userStatus.user?.id) return
    if (timezoneCapturedRef.current) return
    
    // Check if we already captured timezone in this session
    const captureKey = `tz_captured_${userStatus.user.id}`
    if (typeof window !== 'undefined' && localStorage.getItem(captureKey)) {
      timezoneCapturedRef.current = true
      return
    }
    
    // Get browser timezone
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!browserTimezone) return
    
    // Mark as captured to prevent repeated calls
    timezoneCapturedRef.current = true
    if (typeof window !== 'undefined') {
      localStorage.setItem(captureKey, 'true')
    }
    
    // Send to API (fire and forget - don't block UI)
    fetch('/api/users/timezone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: browserTimezone })
    }).catch(() => {
      // Silent fail - timezone capture is non-critical
    })
  }, [userStatus.isAuthenticated, userStatus.user?.id])

  return (
    <UserStatusContext.Provider value={userStatus}>
      {children}
    </UserStatusContext.Provider>
  )
}

/**
 * Export context for advanced use cases
 */
export { UserStatusContext }
