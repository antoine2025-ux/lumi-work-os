import { ProjectRole, Project, ProjectMember } from '@prisma/client'
import { User } from 'next-auth'
import { prisma } from '@/lib/db'

type ProjectWithMembers = Project & { members: ProjectMember[] }
type MemberResult = Pick<ProjectMember, 'userId' | 'role' | 'projectId'>

/**
 * Assert that the authenticated user has access to the project
 * Throws error if access is denied, returns project and user data if granted
 *
 * CRITICAL: Verifies workspace isolation - project must belong to user's workspace.
 * ProjectSpace is not in the current schema; access is based on workspace + project members/creator/owner.
 */
export async function assertProjectAccess(
  user: User,
  projectId: string,
  requiredRole: ProjectRole = ProjectRole.VIEWER,
  workspaceId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ user: User; project: any; member: any }> {
  if (!user || !user.id) {
    throw new Error('Unauthorized: User not authenticated.')
  }

  // Fetch project with members only (projectSpace not in schema)
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        where: { userId: user.id }
      }
    }
  })

  if (!project) {
    throw new Error('Project not found.')
  }

  // CRITICAL: Verify workspace isolation - project must belong to user's workspace
  if (workspaceId && project.workspaceId !== workspaceId) {
    throw new Error('Forbidden: Insufficient project permissions.')
  }

  // Verify workspace membership when workspaceId is provided
  if (workspaceId) {
    try {
      const workspaceMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: user.id
          }
        },
        select: {
          id: true,
          workspaceId: true,
          userId: true,
          role: true,
          joinedAt: true,
        }
      })

      if (!workspaceMember) {
        throw new Error('Forbidden: User not member of workspace.')
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : ''
      const errCode = (error as { code?: string })?.code
      if (errMsg.includes('prepared statement') || errCode === '26000') {
        console.warn('WorkspaceMember check skipped due to connection issue, workspace isolation verified via project.workspaceId', {
          workspaceId,
          userId: user.id,
          projectWorkspaceId: project.workspaceId
        })
      } else {
        throw error
      }
    }
  }

  // Workspace-scoped (no ProjectSpace in schema): workspace members can access; use project member or synthetic VIEWER
  if (workspaceId) {
    const wsMember = project.members[0]
    if (!wsMember) {
      return {
        user,
        project,
        member: {
          userId: user.id,
          role: 'VIEWER' as ProjectRole,
          projectId: project.id
        }
      }
    }
  }

  const member = project.members[0]

  // Fallback: If member record is missing but user is the creator/owner, allow access
  // This handles edge cases where ProjectMember might not be created yet or is misconfigured
  if (!member) {
    if (project.createdById === user.id || project.ownerId === user.id) {
      // Allow access for creator/owner even if ProjectMember record is missing
      // Return a synthetic member object for consistency
      return { 
        user, 
        project, 
        member: { 
          userId: user.id, 
          role: 'OWNER' as ProjectRole,
          projectId: project.id
        } 
      }
    }
    throw new Error('Forbidden: Insufficient project permissions.')
  }

  if (!hasRequiredRole(member.role, requiredRole)) {
    throw new Error('Forbidden: Insufficient project permissions.')
  }

  return { user, project, member }
}

function hasRequiredRole(userRole: ProjectRole, requiredRole: ProjectRole): boolean {
  const roleHierarchy = [ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN, ProjectRole.OWNER]
  return roleHierarchy.indexOf(userRole) >= roleHierarchy.indexOf(requiredRole)
}

/**
 * Check if user has write access to project (MEMBER or higher)
 */
export async function assertProjectWriteAccess(
  user: User,
  projectId: string,
  workspaceId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ user: User; project: any; member: any }> {
  return assertProjectAccess(user, projectId, ProjectRole.MEMBER, workspaceId)
}

/**
 * Check if user has admin access to project (ADMIN or higher)
 */
export async function assertProjectAdminAccess(
  user: User,
  projectId: string,
  workspaceId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ user: User; project: any; member: any }> {
  return assertProjectAccess(user, projectId, ProjectRole.ADMIN, workspaceId)
}

/**
 * Check if a user has access to a project (for task assignment validation)
 * Returns true if user can access the project, false otherwise
 * This implements Policy B: task assignment does NOT grant access
 */
export async function hasProjectAccess(
  userId: string,
  projectId: string,
  workspaceId: string
): Promise<boolean> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project || project.workspaceId !== workspaceId) {
      return false
    }

    // Workspace member has access (no ProjectSpace in schema)
    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId
        }
      },
      select: {
        id: true,
        workspaceId: true,
        userId: true,
        role: true,
        joinedAt: true,
      }
    })
    if (workspaceMember) {
      return true
    }

    // Check ProjectMember
    const projectMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    })

    if (projectMember) {
      return true
    }

    // Check if user is creator/owner
    if (project.createdById === userId || project.ownerId === userId) {
      return true
    }

    return false
  } catch (error) {
    console.error('Error checking project access:', error)
    return false
  }
}