import { prisma } from '@/lib/db'
import { isDevBypassAllowed } from '@/lib/unified-auth'

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

export interface AccessOptions {
  userId: string
  workspaceId: string
  projectId?: string
  scope: 'workspace' | 'project'
  requireRole?: Role[]
}

/**
 * Assert user has required access to workspace or project
 * Throws 403 if insufficient permissions
 */
export async function assertAccess(opts: AccessOptions): Promise<void> {
  const { userId, workspaceId, projectId, scope, requireRole = ['MEMBER'] } = opts

  // Check workspace access first
  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        userId,
        workspaceId
      }
    }
  })

  if (!workspaceMember) {
    // Allow dev bypass in development
    if (isDevBypassAllowed()) {
      console.warn(`Dev bypass: User ${userId} not found in workspace ${workspaceId}`)
      return
    }
    throw new Error('Forbidden: User not member of workspace')
  }

  // Check if workspace role is sufficient
  if (hasRequiredRole(workspaceMember.role, requireRole)) {
    return
  }

  // For project scope, check project-specific permissions
  if (scope === 'project' && projectId) {
    const projectMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    })

    if (projectMember && hasRequiredRole(projectMember.role, requireRole)) {
      return
    }

    // Check if user is project creator or owner
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdById: true, ownerId: true }
    })

    if (project && (project.createdById === userId || project.ownerId === userId)) {
      return
    }
  }

  // Allow dev bypass in development
  if (isDevBypassAllowed()) {
    console.warn(`Dev bypass: User ${userId} lacks required role ${requireRole.join(', ')} for ${scope} ${projectId || workspaceId}`)
    return
  }

  throw new Error(`Forbidden: Insufficient ${scope} permissions`)
}

/**
 * Check if user role meets required role level
 */
function hasRequiredRole(userRole: string, requiredRoles: Role[]): boolean {
  const roleHierarchy: Record<Role, number> = {
    VIEWER: 1,
    MEMBER: 2,
    ADMIN: 3,
    OWNER: 4
  }

  const userRoleLevel = roleHierarchy[userRole as Role] || 0
  const requiredLevel = Math.min(...requiredRoles.map(role => roleHierarchy[role]))

  return userRoleLevel >= requiredLevel
}

/**
 * Assert workspace access only
 */
export async function assertWorkspaceAccess(
  userId: string,
  workspaceId: string,
  requireRole: Role[] = ['MEMBER']
): Promise<void> {
  return assertAccess({
    userId,
    workspaceId,
    scope: 'workspace',
    requireRole
  })
}

/**
 * Assert project access
 */
export async function assertProjectAccess(
  userId: string,
  projectId: string,
  requireRole: Role[] = ['MEMBER']
): Promise<void> {
  // Get project's workspace
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true }
  })

  if (!project) {
    throw new Error('Project not found')
  }

  return assertAccess({
    userId,
    workspaceId: project.workspaceId,
    projectId,
    scope: 'project',
    requireRole
  })
}

/**
 * Get user's role in workspace
 */
export async function getUserWorkspaceRole(
  userId: string,
  workspaceId: string
): Promise<Role | null> {
  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        userId,
        workspaceId
      }
    }
  })

  return workspaceMember?.role as Role || null
}

/**
 * Get user's role in project
 */
export async function getUserProjectRole(
  userId: string,
  projectId: string
): Promise<Role | null> {
  const projectMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId
      }
    }
  })

  return projectMember?.role as Role || null
}
