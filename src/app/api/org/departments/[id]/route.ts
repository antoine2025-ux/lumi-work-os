import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"

// GET /api/org/departments/[id] - Get a specific department
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const { id } = await params
    
    // Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    const department = await prisma.orgDepartment.findFirst({
      where: {
        id,
        workspaceId: auth.workspaceId
      },
      include: {
        teams: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          include: {
            _count: {
              select: { positions: true }
            }
          }
        },
        _count: {
          select: { teams: true }
        }
      }
    })

    if (!department) {
      return NextResponse.json({ 
        error: 'Department not found' 
      }, { status: 404 })
    }

    return NextResponse.json(department)
  } catch (error) {
    console.error('Error fetching department:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch department' 
    }, { status: 500 })
  }
}

// PUT /api/org/departments/[id] - Update a department
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const { id } = await params
    
    // Assert workspace access (require ADMIN or OWNER)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const { name, description, color, order, isActive } = body

    // Check if department exists and belongs to workspace
    const existing = await prisma.orgDepartment.findFirst({
      where: {
        id,
        workspaceId: auth.workspaceId
      }
    })

    if (!existing) {
      return NextResponse.json({ 
        error: 'Department not found' 
      }, { status: 404 })
    }

    // If name is being changed, check for conflicts
    if (name && name !== existing.name) {
      const conflict = await prisma.orgDepartment.findFirst({
        where: {
          workspaceId: auth.workspaceId,
          name: name.trim(),
          isActive: true,
          id: { not: resolvedParams.id }
        }
      })

      if (conflict) {
        return NextResponse.json({ 
          error: 'A department with this name already exists' 
        }, { status: 409 })
      }
    }

    // Update the department
    const department = await prisma.orgDepartment.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(color !== undefined && { color: color || null }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        teams: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { teams: true }
        }
      }
    })

    return NextResponse.json(department)
  } catch (error) {
    console.error('Error updating department:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'A department with this name already exists' 
      }, { status: 409 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to update department' 
    }, { status: 500 })
  }
}

// DELETE /api/org/departments/[id] - Delete a department
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const { id } = await params
    
    // Assert workspace access (require ADMIN or OWNER)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    // Check if department exists and belongs to workspace
    const existing = await prisma.orgDepartment.findFirst({
      where: {
        id,
        workspaceId: auth.workspaceId
      },
      include: {
        _count: {
          select: { teams: true }
        }
      }
    })

    if (!existing) {
      return NextResponse.json({ 
        error: 'Department not found' 
      }, { status: 404 })
    }

    // Check if department has teams
    if (existing._count.teams > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete department with existing teams. Please delete or move teams first.' 
      }, { status: 400 })
    }

    // Delete the department
    await prisma.orgDepartment.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: 'Department deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting department:', error)
    return NextResponse.json({ 
      error: 'Failed to delete department' 
    }, { status: 500 })
  }
}

