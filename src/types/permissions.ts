export type UserRole = 'admin' | 'editor' | 'viewer'

export type PermissionLevel = 'public' | 'team' | 'private'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

export interface Permission {
  id: string
  userId: string
  resourceId: string
  resourceType: 'page' | 'folder'
  permissionLevel: PermissionLevel
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canManagePermissions: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PagePermission {
  id: string
  pageId: string
  userId?: string
  role?: UserRole
  permissionLevel: PermissionLevel
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canManagePermissions: boolean
  createdAt: Date
  updatedAt: Date
}

export interface FolderPermission {
  id: string
  folderId: string
  userId?: string
  role?: UserRole
  permissionLevel: PermissionLevel
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canManagePermissions: boolean
  inheritFromParent: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PermissionCheck {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canManagePermissions: boolean
  reason?: string
}

export interface PermissionContext {
  user: User
  resourceId: string
  resourceType: 'page' | 'folder'
  parentPermissions?: PermissionCheck
}



