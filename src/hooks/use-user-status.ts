import { useState, useEffect, useRef } from 'react'

interface UserStatus {
  isAuthenticated: boolean
  isFirstTime: boolean
  user: {
    id: string
    name: string
    email: string
  }
  workspaceId: string | null
  role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' // Optional for backward compatibility
  isDevelopment: boolean
  error?: string
  pendingInvite?: {
    token: string
    workspace: {
      slug: string
      name: string
    }
  } | null
}

interface UseUserStatusReturn {
  userStatus: UserStatus | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// Global cache to prevent duplicate requests
let userStatusCache: {
  data: UserStatus | null
  promise: Promise<UserStatus> | null
  timestamp: number
} = {
  data: null,
  promise: null,
  timestamp: 0
}

const CACHE_DURATION = 5000 // 5 seconds - shorter cache to detect logout faster

export function useUserStatus(): UseUserStatusReturn {
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasInitialized = useRef(false)

  const fetchUserStatus = async (): Promise<UserStatus> => {
    // Check cache first
    const now = Date.now()
    if (userStatusCache.data && (now - userStatusCache.timestamp) < CACHE_DURATION) {
      return userStatusCache.data
    }

    // If there's already a request in progress, wait for it
    if (userStatusCache.promise) {
      return userStatusCache.promise
    }

    // Create new request
    userStatusCache.promise = fetch('/api/auth/user-status', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        return response.json()
      })
      .then((data) => {
        userStatusCache.data = data
        userStatusCache.timestamp = now
        userStatusCache.promise = null
        return data
      })
      .catch((err) => {
        userStatusCache.promise = null
        throw err
      })

    return userStatusCache.promise
  }

  const refetch = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Clear cache to force fresh fetch
      userStatusCache.data = null
      userStatusCache.timestamp = 0
      
      const data = await fetchUserStatus()
      setUserStatus(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user status'
      setError(errorMessage)
      console.error('Error fetching user status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitialized.current) {
      return
    }
    
    hasInitialized.current = true
    
    const loadUserStatus = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const data = await fetchUserStatus()
        setUserStatus(data)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user status'
        setError(errorMessage)
        console.error('Error fetching user status:', err)
      } finally {
        setLoading(false)
      }
    }

    loadUserStatus()
  }, []) // Empty dependency array to run only once

  return {
    userStatus,
    loading,
    error,
    refetch
  }
}

// Clear cache function for logout
export function clearUserStatusCache() {
  userStatusCache = {
    data: null,
    promise: null,
    timestamp: 0
  }
}
