import { NextRequest, NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { onRoleCardChanged } from '@/lib/org/liveUpdateHooks'
import { RoleCardCreateSchema } from '@/lib/validations/role-cards'

// GET /api/role-cards - Get all role cards for a workspace
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const roleCards = await prisma.roleCard.findMany({
      where: {
        workspaceId: auth.workspaceId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(roleCards)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// POST /api/role-cards - Create a new role card
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)
    
    const body = RoleCardCreateSchema.parse(await request.json())
    console.log('🔍 Request body:', body)
    
    const { 
      positionId,
      roleName, 
      jobFamily, 
      roleDescription,
      responsibilities
    } = body

    // Verify position exists and belongs to workspace
    const position = await prisma.orgPosition.findFirst({
      where: {
        id: positionId,
        workspaceId: auth.workspaceId
      }
    })

    if (!position) {
      return NextResponse.json({ 
        error: 'Position not found' 
      }, { status: 404 })
    }

    // Check if role card already exists for this position
    const existing = await prisma.roleCard.findUnique({
      where: { positionId }
    })

    if (existing) {
      return NextResponse.json({ 
        error: 'A role card already exists for this position' 
      }, { status: 409 })
    }

    const roleCard = await prisma.roleCard.create({
      data: {
        workspaceId: auth.workspaceId,
        positionId,
        roleName: roleName.trim(),
        jobFamily: jobFamily || '', // Optional - empty string if not provided
        level: '', // Not used in new simplified model but kept for schema compatibility
        roleDescription: roleDescription.trim(),
        responsibilities: responsibilities || [],
        requiredSkills: [], // Not used in new simplified model but kept for schema compatibility
        preferredSkills: [], // Not used in new simplified model but kept for schema compatibility
        keyMetrics: [], // Not used in new simplified model but kept for schema compatibility
        createdById: auth.user.userId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    })

    // Update role ContextItem in Context Store
    await onRoleCardChanged({
      workspaceId: auth.workspaceId,
      roleCardId: roleCard.id,
    });

    return NextResponse.json({ roleCard })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}