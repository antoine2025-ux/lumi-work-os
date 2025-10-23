import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireDevAuth } from '@/lib/dev-auth'
import { logAuditEvent } from '@/lib/audit'
import { getPermissionContext, calculateOrgPermissions } from '@/lib/permissions'

// GET /api/org/positions/[id] - Get a specific org position
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    await requireDevAuth(request)

    const position = await prisma.orgPosition.findUnique({
      where: { id: resolvedParams.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
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
            department: true,
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
    const resolvedParams = await params
    const context = await getPermissionContext(request)
    const permissions = calculateOrgPermissions(context)
    
    // Check permissions
    if (!permissions.canEditRoles) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      title, 
      department, 
      level,
      parentId,
      userId,
      order,
      isActive = true
    } = body

    // Check if position exists
    const existingPosition = await prisma.orgPosition.findUnique({
      where: { id: resolvedParams.id }
    })

    if (!existingPosition) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }

    // Update the org position
    const position = await prisma.orgPosition.update({
      where: { id: resolvedParams.id },
      data: {
        title,
        department,
        level,
        parentId: parentId || null,
        userId: userId || null,
        order,
        isActive
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
            department: true,
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

    // Log audit event
    await logAuditEvent({
      workspaceId: context.workspaceId,
      userId: context.userId,
      action: 'UPDATE',
      entityType: 'POSITION',
      entityId: resolvedParams.id,
      oldValues: {
        title: existingPosition.title,
        department: existingPosition.department,
        level: existingPosition.level,
        userId: existingPosition.userId,
        isActive: existingPosition.isActive,
      },
      newValues: {
        title: position.title,
        department: position.department,
        level: position.level,
        userId: position.userId,
        isActive: position.isActive,
      },
      metadata: {
        reason: 'Role updated',
        department: position.department,
      },
    })

    return NextResponse.json(position)
  } catch (error) {
    console.error('Error updating org position:', error)
    return NextResponse.json({ error: 'Failed to update org position' }, { status: 500 })
  }
}

// DELETE /api/org/positions/[id] - Delete an org position
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    console.log('DELETE request for position:', resolvedParams.id)
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      console.log('Unauthorized: No session or email')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if position exists
    const existingPosition = await prisma.orgPosition.findUnique({
      where: { id: resolvedParams.id },
      include: {
        children: true
      }
    })

    console.log('Found position:', existingPosition ? 'Yes' : 'No')

    if (!existingPosition) {
      console.log('Position not found, returning 404')
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }

    // Check if position has children
    console.log('Position has children:', existingPosition.children.length)
    if (existingPosition.children.length > 0) {
      console.log('Cannot delete position with children, returning 400')
      return NextResponse.json({ 
        error: 'Cannot delete position with direct reports. Please reassign or delete direct reports first.' 
      }, { status: 400 })
    }

    // Soft delete by setting isActive to false
    console.log('Performing soft delete...')
    await prisma.orgPosition.update({
      where: { id: resolvedParams.id },
      data: { isActive: false }
    })

    console.log('Position deleted successfully')
    return NextResponse.json({ message: 'Position deleted successfully' })
  } catch (error) {
    console.error('Error deleting org position:', error)
    return NextResponse.json({ error: 'Failed to delete org position' }, { status: 500 })
  }
}
