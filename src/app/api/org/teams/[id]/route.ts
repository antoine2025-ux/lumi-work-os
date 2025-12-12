import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"

// GET /api/org/teams/[id] - Get a specific team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const { id } = await params
    
    // Assert workspace access (VIEWER can read org structure)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    const team = await prisma.orgTeam.findFirst({
      where: {
        id,
        workspaceId: auth.workspaceId
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        positions: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        },
        _count: {
          select: { positions: true }
        }
      }
    })

    if (!team) {
      return NextResponse.json({ 
        error: 'Team not found' 
      }, { status: 404 })
    }

    return NextResponse.json(team)
  } catch (error) {
    console.error('Error fetching team:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch team' 
    }, { status: 500 })
  }
}

// PUT /api/org/teams/[id] - Update a team
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
    const { name, description, color, order, isActive, departmentId } = body

    // Check if team exists and belongs to workspace
    const existing = await prisma.orgTeam.findFirst({
      where: {
        id,
        workspaceId: auth.workspaceId
      }
    })

    if (!existing) {
      return NextResponse.json({ 
        error: 'Team not found' 
      }, { status: 404 })
    }

    // If department is being changed, verify new department exists
    if (departmentId && departmentId !== existing.departmentId) {
      const department = await prisma.orgDepartment.findFirst({
        where: {
          id: departmentId,
          workspaceId: auth.workspaceId
        }
      })

      if (!department) {
        return NextResponse.json({ 
          error: 'Department not found' 
        }, { status: 404 })
      }
    }

    // If name is being changed, check for conflicts
    const finalDepartmentId = departmentId || existing.departmentId
    if (name && name !== existing.name) {
      const conflict = await prisma.orgTeam.findUnique({
        where: {
          workspaceId_departmentId_name: {
            workspaceId: auth.workspaceId,
            departmentId: finalDepartmentId,
            name: name.trim()
          }
        }
      })

      if (conflict) {
        return NextResponse.json({ 
          error: 'A team with this name already exists in this department' 
        }, { status: 409 })
      }
    }

    // Update the team
    const team = await prisma.orgTeam.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(color !== undefined && { color: color || null }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
        ...(departmentId && { departmentId: finalDepartmentId })
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        _count: {
          select: { positions: true }
        }
      }
    })

    return NextResponse.json(team)
  } catch (error) {
    console.error('Error updating team:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'A team with this name already exists in this department' 
      }, { status: 409 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to update team' 
    }, { status: 500 })
  }
}

// DELETE /api/org/teams/[id] - Delete a team
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

    // Check if team exists and belongs to workspace
    const existing = await prisma.orgTeam.findFirst({
      where: {
        id,
        workspaceId: auth.workspaceId
      },
      include: {
        _count: {
          select: { positions: true }
        }
      }
    })

    if (!existing) {
      return NextResponse.json({ 
        error: 'Team not found' 
      }, { status: 404 })
    }

    // Check if team has positions
    if (existing._count.positions > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete team with existing positions. Please delete or move positions first.' 
      }, { status: 400 })
    }

    // Delete the team
    await prisma.orgTeam.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: 'Team deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting team:', error)
    return NextResponse.json({ 
      error: 'Failed to delete team' 
    }, { status: 500 })
  }
}

