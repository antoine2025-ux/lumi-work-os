import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { logger } from "@/lib/logger"
import { buildLogContextFromRequest } from "@/lib/request-context"

// Helper to hash workspaceId for logging (privacy/correlation protection)
function hashWorkspaceId(workspaceId: string | null): string | undefined {
  if (!workspaceId) return undefined
  return workspaceId.slice(-6)
}

// GET /api/org/departments - List all departments for a workspace
export async function GET(request: NextRequest) {
  const startTime = performance.now()
  const baseContext = await buildLogContextFromRequest(request)
  
  try {
    const authStartTime = performance.now()
    const auth = await getUnifiedAuth(request)
    const authDurationMs = performance.now() - authStartTime
    
    // Assert workspace access (VIEWER can read org structure)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const dbStartTime = performance.now()
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
    const dbDurationMs = performance.now() - dbStartTime
    const totalDurationMs = performance.now() - startTime

    logger.info('org/departments GET', {
      ...baseContext,
      durationMs: Math.round(totalDurationMs * 100) / 100,
      authDurationMs: Math.round(authDurationMs * 100) / 100,
      dbDurationMs: Math.round(dbDurationMs * 100) / 100,
      resultCount: departments.length,
      workspaceIdHash: hashWorkspaceId(auth.workspaceId)
    })

    if (totalDurationMs > 500) {
      logger.warn('org/departments GET (slow)', {
        ...baseContext,
        durationMs: Math.round(totalDurationMs * 100) / 100,
        authDurationMs: Math.round(authDurationMs * 100) / 100,
        dbDurationMs: Math.round(dbDurationMs * 100) / 100,
        resultCount: departments.length,
        workspaceIdHash: hashWorkspaceId(auth.workspaceId)
      })
    }

    return NextResponse.json(departments)
  } catch (error: any) {
    const totalDurationMs = performance.now() - startTime
    logger.error('org/departments GET (error)', {
      ...baseContext,
      durationMs: Math.round(totalDurationMs * 100) / 100
    }, error instanceof Error ? error : new Error(String(error)))
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
    // Use findFirst instead of findUnique for better compatibility
    const existing = await prisma.orgDepartment.findFirst({
      where: {
        workspaceId: auth.workspaceId,
        name: name.trim(),
        isActive: true
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
      console.error('Database table missing. Migration should run automatically on next deployment.')
      return NextResponse.json({ 
        error: 'Database tables are being created. Please try again in a moment, or contact support if the issue persists.',
        code: 'MIGRATION_REQUIRED'
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to create department' 
    }, { status: 500 })
  }
}

