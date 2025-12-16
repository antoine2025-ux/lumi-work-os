import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'

// GET /api/org/positions/[id] - Get a specific org position
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const resolvedParams = await params
    
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    const position = await prisma.orgPosition.findFirst({
      where: { 
        id: resolvedParams.id,
        workspaceId: auth.workspaceId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        parent: {
          select: {
            id: true,
            title: true,
            user: {
              select: {
                name: true
              }
            }
          }
        },
        children: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            title: true,
            teamId: true,
            level: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    if (!position) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }

    return NextResponse.json(position)
  } catch (error) {
    console.error('Error fetching org position:', error)
    return NextResponse.json({ error: 'Failed to fetch org position' }, { status: 500 })
  }
}

// PUT /api/org/positions/[id] - Update an org position
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const resolvedParams = await params
    
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const { 
      title, 
      teamId,
      level,
      parentId,
      userId,
      order,
      isActive
    } = body

    // Check if position exists
    const existingPosition = await prisma.orgPosition.findFirst({
      where: { 
        id: resolvedParams.id,
        workspaceId: auth.workspaceId
      }
    })

    if (!existingPosition) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }

    // If assigning a user, validate single-occupant constraint
    if (userId !== undefined && userId !== null) {
      // Check if position is already occupied by different user
      if (existingPosition.userId && existingPosition.userId !== userId) {
        return NextResponse.json(
          { error: 'Position is already occupied by another user' },
          { status: 409 }
        )
      }
      
      // Remove user from other positions in same workspace (enforce one-position-per-user-per-workspace)
      await prisma.orgPosition.updateMany({
        where: {
          workspaceId: existingPosition.workspaceId,
          userId,
          id: { not: resolvedParams.id }
        },
        data: { userId: null }
      })
    }

    // Build update data - only include fields that are provided
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (teamId !== undefined) updateData.teamId = teamId || null
    if (level !== undefined) updateData.level = level
    if (parentId !== undefined) updateData.parentId = parentId || null
    if (userId !== undefined) updateData.userId = userId || null
    if (order !== undefined) updateData.order = order
    if (isActive !== undefined) updateData.isActive = isActive

    // Update the org position
    const position = await prisma.orgPosition.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        parent: {
          select: {
            id: true,
            title: true,
            user: {
              select: {
                name: true
              }
            }
          }
        },
        children: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            title: true,
            teamId: true,
            level: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    return NextResponse.json(position)
  } catch (error: any) {
    console.error('Error updating org position:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    })
    return NextResponse.json({ 
      error: error.message || 'Failed to update org position',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

// DELETE /api/org/positions/[id] - Delete an org position
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const resolvedParams = await params
    
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    // Check if position exists
    const existingPosition = await prisma.orgPosition.findFirst({
      where: { 
        id: resolvedParams.id,
        workspaceId: auth.workspaceId
      },
      include: {
        children: true
      }
    })

    if (!existingPosition) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }

    // Check if position has children
    if (existingPosition.children.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete position with direct reports. Please reassign or delete direct reports first.' 
      }, { status: 400 })
    }

    // Soft delete by setting isActive to false
    await prisma.orgPosition.update({
      where: { id: resolvedParams.id },
      data: { isActive: false }
    })

    return NextResponse.json({ message: 'Position deleted successfully' })
  } catch (error) {
    console.error('Error deleting org position:', error)
    return NextResponse.json({ error: 'Failed to delete org position' }, { status: 500 })
  }
}
