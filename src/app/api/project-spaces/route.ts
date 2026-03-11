import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { ProjectSpaceVisibility } from '@prisma/client'
import { handleApiError } from '@/lib/api-errors'

// @deprecated Use /api/spaces instead (unified Space model, Sprint 2).
// This route is kept for backward compatibility during the transition period.

// GET /api/project-spaces - List all ProjectSpaces for the current workspace
export async function GET(request: NextRequest) {
  console.warn('[DEPRECATED] GET /api/project-spaces — use GET /api/spaces instead')
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // Set workspace context
    setWorkspaceContext(auth.workspaceId)

    // Get all ProjectSpaces for the workspace
    const spaces = await prisma.projectSpace.findMany({
      where: { workspaceId: auth.workspaceId },
      select: {
        id: true,
        name: true,
        description: true,
        visibility: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Lazy creation: If no ProjectSpaces exist, create "General" (PUBLIC)
    if (spaces.length === 0) {
      try {
        const generalSpace = await prisma.projectSpace.create({
          data: {
            workspaceId: auth.workspaceId,
            name: 'General',
            description: 'Default project space for all projects',
            visibility: ProjectSpaceVisibility.PUBLIC
          },
          select: {
            id: true,
            name: true,
            description: true,
            visibility: true,
            createdAt: true,
            updatedAt: true
          }
        })
        return NextResponse.json({ spaces: [generalSpace] })
      } catch (error: unknown) {
    return handleApiError(error, request)
  }
    }

    return NextResponse.json({ spaces })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
