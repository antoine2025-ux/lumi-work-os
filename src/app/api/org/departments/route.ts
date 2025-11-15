import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"

// GET /api/org/departments - List all departments for a workspace
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

    const departments = await prisma.orgDepartment.findMany({
      where: {
        workspaceId: auth.workspaceId,
        isActive: true
      },
      include: {
        teams: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { teams: true }
        }
      },
      orderBy: { order: 'asc' }
    })

    return NextResponse.json(departments)
  } catch (error: any) {
    console.error('Error fetching departments:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch departments' 
    }, { status: 500 })
  }
}

// POST /api/org/departments - Create a new department
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access (require ADMIN or OWNER to create departments)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const { 
      name, 
      description, 
      color,
      order = 0
    } = body

    if (!name) {
      return NextResponse.json({ 
        error: 'Missing required field: name' 
      }, { status: 400 })
    }

    // Check if department with same name already exists
    const existing = await prisma.orgDepartment.findUnique({
      where: {
        workspaceId_name: {
          workspaceId: auth.workspaceId,
          name: name.trim()
        }
      }
    })

    if (existing) {
      return NextResponse.json({ 
        error: 'A department with this name already exists' 
      }, { status: 409 })
    }

    // Create the department
    const department = await prisma.orgDepartment.create({
      data: {
        workspaceId: auth.workspaceId,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null,
        order
      },
      include: {
        _count: {
          select: { teams: true }
        }
      }
    })

    return NextResponse.json(department, { status: 201 })
  } catch (error: any) {
    console.error('Error creating department:', error)
    
    // Handle Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'A department with this name already exists' 
      }, { status: 409 })
    }
    
    // Handle table doesn't exist error
    if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('org_departments')) {
      return NextResponse.json({ 
        error: 'Database migration required. Please run: npx prisma migrate dev' 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to create department' 
    }, { status: 500 })
  }
}

