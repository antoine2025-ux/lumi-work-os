// Permission system for Lumi Work OS
export enum PermissionLevel {
  PUBLIC = 'public',      // Anyone can view
  TEAM = 'team',          // Team members can view
  PRIVATE = 'private',    // Only specific users/roles can view
  RESTRICTED = 'restricted' // Very limited access
}

export enum PermissionAction {
  VIEW = 'view',
  EDIT = 'edit',
  DELETE = 'delete',
  MANAGE_PERMISSIONS = 'manage_permissions'
}

export interface PagePermission {
  id: string
  pageId: string
  userId?: string
  role?: WorkspaceRole
  teamId?: string
  permission: PermissionAction
  granted: boolean
}

export interface UserPermissions {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canManagePermissions: boolean
  permissionLevel: PermissionLevel
}

// Permission checking logic
export class PermissionService {
  static async getUserPermissions(
    userId: string,
    pageId: string,
    userRole: WorkspaceRole,
    pagePermissions: PagePermission[]
  ): Promise<UserPermissions> {
    // Owners and Admins have full access
    if (userRole === 'OWNER' || userRole === 'ADMIN') {
      return {
        canView: true,
        canEdit: true,
        canDelete: true,
        canManagePermissions: true,
        permissionLevel: PermissionLevel.PUBLIC
      }
    }

    // Check specific permissions for the page
    const userPermissions = pagePermissions.filter(p => 
      p.userId === userId || 
      p.role === userRole ||
      p.granted === true
    )

    const canView = userPermissions.some(p => p.permission === PermissionAction.VIEW)
    const canEdit = userPermissions.some(p => p.permission === PermissionAction.EDIT)
    const canDelete = userPermissions.some(p => p.permission === PermissionAction.DELETE)
    const canManagePermissions = userPermissions.some(p => p.permission === PermissionAction.MANAGE_PERMISSIONS)

    // Determine permission level based on access
    let permissionLevel = PermissionLevel.PRIVATE
    if (canView && canEdit) {
      permissionLevel = PermissionLevel.TEAM
    } else if (canView) {
      permissionLevel = PermissionLevel.PRIVATE
    }

    return {
      canView,
      canEdit,
      canDelete,
      canManagePermissions,
      permissionLevel
    }
  }

  static getPermissionLevelDisplay(level: PermissionLevel): string {
    switch (level) {
      case PermissionLevel.PUBLIC:
        return 'Public'
      case PermissionLevel.TEAM:
        return 'Team'
      case PermissionLevel.PRIVATE:
        return 'Private'
      case PermissionLevel.RESTRICTED:
        return 'Restricted'
      default:
        return 'Private'
    }
  }

  static getPermissionLevelColor(level: PermissionLevel): string {
    switch (level) {
      case PermissionLevel.PUBLIC:
        return 'bg-green-100 text-green-800'
      case PermissionLevel.TEAM:
        return 'bg-blue-100 text-blue-800'
      case PermissionLevel.PRIVATE:
        return 'bg-yellow-100 text-yellow-800'
      case PermissionLevel.RESTRICTED:
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
}