"use client"

import React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { calculateOrgPermissions, PermissionContext as PermissionContextType, UserRole } from '@/lib/permissions'
import { useUserStatusContext } from '@/providers/user-status-provider'

interface PermissionHookContextType {
  context: PermissionContextType | null
  permissions: ReturnType<typeof calculateOrgPermissions> | null
  loading: boolean
  error: string | null
}

const PermissionHookContext = createContext<PermissionHookContextType>({
  context: null,
  permissions: null,
  loading: true,
  error: null,
})

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  // Use centralized UserStatusContext - no separate API call needed
  const userStatus = useUserStatusContext()
  const userStatusLoading = userStatus.isLoading
  const [context, setContext] = useState<PermissionContextType | null>(null)
  const [permissions, setPermissions] = useState<ReturnType<typeof calculateOrgPermissions> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPermissions() {
      try {
        // Wait for user status to be loaded
        if (userStatusLoading || !userStatus.isAuthenticated) {
          return
        }
        
        if (!userStatus.workspaceId) {
          throw new Error('No workspace found')
        }

        // Get user role from userStatus (no separate API call needed)
        // Default to MEMBER for backward compatibility if role is missing
        const userRole = (userStatus.role || 'MEMBER') as UserRole
        
        const permissionContext: PermissionContextType = {
          userId: userStatus.user?.id || '',
          workspaceId: userStatus.workspaceId,
          userRole: userRole,
          isOwner: userRole === 'OWNER',
          isAdmin: userRole === 'ADMIN' || userRole === 'OWNER',
          isMember: userRole === 'MEMBER' || userRole === 'ADMIN' || userRole === 'OWNER',
        }
        
        const calculatedPermissions = calculateOrgPermissions(permissionContext)
        
        setContext(permissionContext)
        setPermissions(calculatedPermissions)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load permissions')
      } finally {
        setLoading(false)
      }
    }

    loadPermissions()
  }, [userStatus.isAuthenticated, userStatus.workspaceId, userStatus.role, userStatus.user?.id, userStatusLoading])

  return (
    <PermissionHookContext.Provider value={{ context, permissions, loading, error }}>
      {children}
    </PermissionHookContext.Provider>
  )
}

export function usePermissionContext() {
  const context = useContext(PermissionHookContext)
  if (!context) {
    throw new Error('usePermissionContext must be used within a PermissionProvider')
  }
  return context
}

