import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'

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
  } catch (error) {
    console.error('Error fetching role cards:', error)
    
    // Handle auth errors
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json({ error: 'Failed to fetch role cards' }, { status: 500 })
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
    
    const body = await request.json()
    console.log('🔍 Request body:', body)
    
    const { 
      positionId,
      roleName, 
      jobFamily, 
      roleDescription,
      responsibilities = []
    } = body

    if (!positionId || !roleName || !roleDescription) {
      return NextResponse.json({ 
        error: 'Missing required fields: positionId, roleName, roleDescription' 
      }, { status: 400 })
    }

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

    return NextResponse.json({ roleCard })
  } catch (error) {
    console.error('Error creating role card:', error)
    
    // Handle auth errors
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json({ error: 'Failed to create role card' }, { status: 500 })
  }
}