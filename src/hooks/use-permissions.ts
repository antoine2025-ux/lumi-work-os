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
        // Get user status to get workspace ID and user info
        const response = await fetch('/api/auth/user-status')
        if (!response.ok) {
          throw new Error('Failed to get user status')
        }
        
        const userStatus = await response.json()
        if (!userStatus.workspaceId) {
          throw new Error('No workspace found')
        }

        // Get user role in workspace
        const roleResponse = await fetch(`/api/workspaces/${userStatus.workspaceId}/user-role`)
        if (!roleResponse.ok) {
          throw new Error('Failed to get user role')
        }
        
        const roleData = await roleResponse.json()
        const userRole = roleData.role || 'MEMBER'
        
        const context: PermissionContext = {
          userId: userStatus.userId || 'unknown',
          workspaceId: userStatus.workspaceId,
          userRole: userRole,
          isOwner: userRole === 'OWNER',
          isAdmin: userRole === 'ADMIN' || userRole === 'OWNER',
          isMember: userRole === 'MEMBER' || userRole === 'ADMIN' || userRole === 'OWNER',
        }
        
        const calculatedPermissions = calculateOrgPermissions(context)
        
        setContext(context)
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
