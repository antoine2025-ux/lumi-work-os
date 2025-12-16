import { getUnifiedAuth, getUserWorkspaceRole } from '@/lib/unified-auth'
import { prisma } from '@/lib/db'

export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface PermissionContext {
  userId: string
  workspaceId: string
  userRole: UserRole
  isOwner: boolean
  isAdmin: boolean
  isMember: boolean
}

export async function getPermissionContext(request?: any): Promise<PermissionContext> {
  try {
    console.log('🔍 Getting permission context')
    const auth = await getUnifiedAuth(request)
    console.log('✅ Auth context:', auth)
    
    // Use the workspace ID from unified auth
    const workspaceId = auth.workspaceId
    console.log('✅ Workspace ID:', workspaceId)
  
    // Get user's role in workspace
    const userRole = (await getUserWorkspaceRole(auth.user.userId, workspaceId) as UserRole) || 'MEMBER'
    console.log('✅ User role:', userRole)
    
    const context = {
      userId: auth.user.userId,
      workspaceId,
      userRole,
      isOwner: userRole === 'OWNER',
      isAdmin: userRole === 'OWNER' || userRole === 'ADMIN',
      isMember: userRole === 'MEMBER'
    }
    
    console.log('✅ Permission context created:', context)
    return context
  } catch (error) {
    console.error('❌ Error in getPermissionContext:', error)
    throw error
  }
}

export interface OrgPermissions {
  canCreateRoles: boolean
  canEditRoles: boolean
  canDeleteRoles: boolean
  canAssignUsers: boolean
  canUnassignUsers: boolean
  canMoveRoles: boolean
  canViewAuditLog: boolean
  canEditOwnProfile: boolean
  canViewFullOrg: boolean
  canEditTeamRoles: boolean
}

export function calculateOrgPermissions(context: PermissionContext): OrgPermissions {
  const { isOwner, isAdmin, isMember } = context

  return {
    // Full admin permissions
    canCreateRoles: isOwner || isAdmin,
    canEditRoles: isOwner || isAdmin,
    canDeleteRoles: isOwner || isAdmin,
    canAssignUsers: isOwner || isAdmin,
    canUnassignUsers: isOwner || isAdmin,
    canMoveRoles: isOwner || isAdmin,
    canViewAuditLog: isOwner || isAdmin,
    
    // Employee permissions
    canEditOwnProfile: true, // Everyone can edit their own profile
    canViewFullOrg: true,   // Everyone can view the org chart
    
    // Manager permissions (future enhancement)
    canEditTeamRoles: false, // TODO: Implement manager-level permissions
  }
}

export function canEditRole(
  context: PermissionContext,
  roleUserId?: string | null
): boolean {
  const permissions = calculateOrgPermissions(context)
  
  // Admins can edit any role
  if (permissions.canEditRoles) {
    return true
  }
  
  // Users can edit roles they're assigned to (future enhancement)
  if (roleUserId && roleUserId === context.userId) {
    return true
  }
  
  return false
}

export function canAssignUser(
  context: PermissionContext,
  targetUserId?: string
): boolean {
  const permissions = calculateOrgPermissions(context)
  
  // Admins can assign anyone
  if (permissions.canAssignUsers) {
    return true
  }
  
  // Future: Managers can assign within their team
  return false
}