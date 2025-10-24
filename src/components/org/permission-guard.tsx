"use client"

import { ReactNode } from 'react'
import { usePermissionContext } from '@/hooks/use-permissions'

interface PermissionGuardProps {
  children: ReactNode
  permission: keyof ReturnType<typeof import('@/lib/permissions').calculateOrgPermissions>
  fallback?: ReactNode
}

export function PermissionGuard({ children, permission, fallback = null }: PermissionGuardProps) {
  const { permissions } = usePermissionContext()
  
  if (!permissions[permission]) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: ('OWNER' | 'ADMIN' | 'MEMBER')[]
  fallback?: ReactNode
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { context } = usePermissionContext()
  
  if (!allowedRoles.includes(context.userRole)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

