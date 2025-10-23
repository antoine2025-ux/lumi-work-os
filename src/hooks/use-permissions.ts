"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { calculateOrgPermissions, PermissionContext } from '@/lib/permissions'

interface PermissionHookContext {
  context: PermissionContext | null
  permissions: ReturnType<typeof calculateOrgPermissions> | null
  loading: boolean
  error: string | null
}

const PermissionContext = createContext<PermissionHookContext>({
  context: null,
  permissions: null,
  loading: true,
  error: null,
})

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<PermissionContext | null>(null)
  const [permissions, setPermissions] = useState<ReturnType<typeof calculateOrgPermissions> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPermissions() {
      try {
        // In development mode, we'll use mock data
        const mockContext: PermissionContext = {
          userId: 'dev-user-1',
          workspaceId: 'cmgl0f0wa00038otlodbw5jhn',
          userRole: 'OWNER', // Dev user is owner
          isOwner: true,
          isAdmin: true,
          isMember: false,
        }
        
        const calculatedPermissions = calculateOrgPermissions(mockContext)
        
        setContext(mockContext)
        setPermissions(calculatedPermissions)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load permissions')
      } finally {
        setLoading(false)
      }
    }

    loadPermissions()
  }, [])

  return (
    <PermissionContext.Provider value={{ context, permissions, loading, error }}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissionContext() {
  const context = useContext(PermissionContext)
  if (!context) {
    throw new Error('usePermissionContext must be used within a PermissionProvider')
  }
  return context
}
