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
      roleName, 
      department, 
      jobFamily, 
      level, 
      roleDescription
    } = body

    console.log('🔍 WorkspaceId being used:', auth.workspaceId)

    if (!roleName || !department || !jobFamily || !level || !roleDescription) {
      return NextResponse.json({ 
        error: 'Missing required fields: roleName, department, jobFamily, level, roleDescription' 
      }, { status: 400 })
    }

    const roleCard = await prisma.roleCard.create({
      data: {
        workspaceId: auth.workspaceId,
        roleName,
        department,
        jobFamily,
        level,
        roleDescription,
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