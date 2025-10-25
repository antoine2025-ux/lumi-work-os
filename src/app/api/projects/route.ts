import { NextRequest, NextResponse } from 'next/server'
import { ProjectCreateSchema } from '@/lib/pm/schemas'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

// GET /api/projects - Get all projects for a workspace
export async function GET(request: NextRequest) {
  try {
    // 1. Get authenticated user with workspace context
    const auth = await getUnifiedAuth(request)
    
    // 2. Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // 3. Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: any = { workspaceId: auth.workspaceId } // 5. Use activeWorkspaceId, no hardcoded values
    if (status) {
      where.status = status
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    
    // Handle auth errors
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch projects' 
    }, { status: 500 })
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    // 1. Get authenticated user with workspace context
    const auth = await getUnifiedAuth(request)
    
    // 2. Assert workspace access (require ADMIN or OWNER to create projects)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    // 3. Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    
    // Validate request body with Zod
    const validatedData = ProjectCreateSchema.parse(body)
    const { 
      name, 
      description, 
      status = 'ACTIVE',
      priority = 'MEDIUM',
      startDate,
      endDate,
      color,
      department,
      team,
      ownerId,
      wikiPageId,
      dailySummaryEnabled = false
    } = validatedData

    // Extract watcher and assignee IDs from the request body
    const { watcherIds = [], assigneeIds = [] } = body

    // Handle empty strings as null/undefined
    const cleanData = {
      ...validatedData,
      department: department || undefined,
      team: team || undefined,
      ownerId: ownerId || undefined,
      wikiPageId: wikiPageId || undefined
    }

    // Create the project
    const project = await prisma.project.create({
      data: {
        workspaceId: auth.workspaceId, // 5. Use activeWorkspaceId
        name,
        description,
        status: status as any,
        priority: priority as any,
        startDate: cleanData.startDate ? new Date(cleanData.startDate) : null,
        endDate: cleanData.endDate ? new Date(cleanData.endDate) : null,
        color,
        department: cleanData.department,
        team: cleanData.team,
        ownerId: cleanData.ownerId || auth.user.userId, // Use provided owner or default to creator
        wikiPageId: cleanData.wikiPageId,
        dailySummaryEnabled,
        createdById: auth.user.userId // 3. Use userId from auth
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      }
    })

    // Add the creator as a project member with OWNER role
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: auth.user.userId, // 3. Use userId from auth
        role: 'OWNER'
      }
    })

    // Create watchers
    if (watcherIds && watcherIds.length > 0) {
      await prisma.projectWatcher.createMany({
        data: watcherIds.map((watcherUserId: string) => ({
          projectId: project.id,
          userId: watcherUserId
        }))
      })
    }

    // Create assignees
    if (assigneeIds && assigneeIds.length > 0) {
      await prisma.projectAssignee.createMany({
        data: assigneeIds.map((assigneeUserId: string) => ({
          projectId: project.id,
          userId: assigneeUserId,
          role: 'MEMBER' // Default role for assignees
        }))
      })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error creating project:', error)
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors)
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    
    // Handle auth errors
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to create project',
      details: error.message 
    }, { status: 500 })
  }
}
