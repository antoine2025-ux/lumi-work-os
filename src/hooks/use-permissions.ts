"use client"

import React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { calculateOrgPermissions, PermissionContext as PermissionContextType } from '@/lib/permissions'
import { useUserStatus } from './use-user-status'

interface PermissionHookContext {
  context: PermissionContextType | null
  permissions: ReturnType<typeof calculateOrgPermissions> | null
  loading: boolean
  error: string | null
}

const PermissionHookContext = createContext<PermissionHookContext>({
  context: null,
  permissions: null,
  loading: true,
  error: null,
})

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { userStatus, loading: userStatusLoading } = useUserStatus()
  const [context, setContext] = useState<PermissionContextType | null>(null)
  const [permissions, setPermissions] = useState<ReturnType<typeof calculateOrgPermissions> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPermissions() {
      try {
        // Wait for user status to be loaded
        if (userStatusLoading || !userStatus) {
          return
        }
        
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
        
        const permissionContext: PermissionContextType = {
          userId: userStatus.user.id,
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
  }, [userStatus, userStatusLoading])

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
