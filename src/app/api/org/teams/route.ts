import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"

// GET /api/org/teams - List all teams for a workspace
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('departmentId')
    
    // Assert workspace access (VIEWER can read org structure)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    const where: any = {
      workspaceId: auth.workspaceId,
      isActive: true
    }

    if (departmentId) {
      where.departmentId = departmentId
    }

    const teams = await prisma.orgTeam.findMany({
      where,
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
      },
      orderBy: [
        { department: { order: 'asc' } },
        { order: 'asc' }
      ]
    })

    return NextResponse.json(teams)
  } catch (error: any) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch teams' 
    }, { status: 500 })
  }
}

// POST /api/org/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access (require ADMIN or OWNER to create teams)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const { 
      name, 
      description, 
      departmentId,
      color,
      order = 0
    } = body

    if (!name) {
      return NextResponse.json({ 
        error: 'Missing required field: name' 
      }, { status: 400 })
    }

    if (!departmentId) {
      return NextResponse.json({ 
        error: 'Missing required field: departmentId' 
      }, { status: 400 })
    }

    // Verify department exists and belongs to workspace
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

    // Check if team with same name already exists in this department
    const existing = await prisma.orgTeam.findUnique({
      where: {
        workspaceId_departmentId_name: {
          workspaceId: auth.workspaceId,
          departmentId,
          name: name.trim()
        }
      }
    })

    if (existing) {
      return NextResponse.json({ 
        error: 'A team with this name already exists in this department' 
      }, { status: 409 })
    }

    // Create the team
    const team = await prisma.orgTeam.create({
      data: {
        workspaceId: auth.workspaceId,
        departmentId,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null,
        order
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

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error('Error creating team:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'A team with this name already exists in this department' 
      }, { status: 409 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to create team' 
    }, { status: 500 })
  }
}

