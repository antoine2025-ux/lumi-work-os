import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { assertProjectAccess } from '@/lib/pm/guards'
import { handleApiError } from '@/lib/api-errors'
import { ProjectRole } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/db'

// Schema for attaching documentation
const AttachDocumentationSchema = z.object({
  wikiPageId: z.string().min(1, 'Wiki page ID is required')
})

type ProjectDocumentationDto = {
  id: string
  wikiPageId: string
  order: number
  createdAt: string
  wikiPage: {
    id: string
    title: string
    slug: string
    workspace_type: string | null
    updatedAt: string
  }
}

// GET /api/projects/[projectId]/documentation - List all attached docs for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['VIEWER'] })
    setWorkspaceContext(auth.workspaceId)
    const resolvedParams = await params
    const projectId = resolvedParams.projectId

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Check project access
    const nextAuthUser = {
      id: auth.user.userId,
      email: auth.user.email,
      name: auth.user.name
    } as any
    // CRITICAL: Pass workspaceId to ensure workspace isolation
    await assertProjectAccess(nextAuthUser, projectId, ProjectRole.VIEWER, auth.workspaceId)

    // Fetch all documentation links for this project
    console.log('[ProjectDocumentation] Attempting to fetch documentation for project:', projectId)
    console.log('[ProjectDocumentation] Prisma client has projectDocumentation:', typeof prisma.projectDocumentation !== 'undefined')
    
    // Debug: Check what database/schema we're connected to and verify table exists
    try {
      const dbInfo = await prisma.$queryRaw<Array<{ current_database: string; current_schema: string }>>`
        SELECT current_database(), current_schema()
      `
      console.log('[ProjectDocumentation] Connected to database:', dbInfo[0]?.current_database)
      console.log('[ProjectDocumentation] Connected to schema:', dbInfo[0]?.current_schema)
      console.log('[ProjectDocumentation] DATABASE_URL (masked):', process.env.DATABASE_URL?.replace(/:[^@]+@/, ':***@') || 'NOT SET')
      
      // Check if table exists
      const tableCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'project_documentation'
        ) as exists
      `
      console.log('[ProjectDocumentation] Table exists check:', tableCheck[0]?.exists)
      
      // If table doesn't exist, try to create it
      if (!tableCheck[0]?.exists) {
        console.log('[ProjectDocumentation] ⚠️ Table not found, attempting to create...')
        // This should not happen, but let's try to create it as a fallback
      }
    } catch (debugErr: any) {
      console.error('[ProjectDocumentation] Debug query failed:', debugErr.message)
    }
    
    const documentationLinks = await prisma.projectDocumentation.findMany({
      where: { projectId },
      include: {
        wikiPage: {
          select: {
            id: true,
            title: true,
            slug: true,
            workspace_type: true,
            updatedAt: true
          }
        }
      },
      orderBy: {
        order: 'asc'
      }
    })
    console.log('[ProjectDocumentation] Successfully fetched', documentationLinks.length, 'documentation links')

    // Transform to DTO format
    const docs: ProjectDocumentationDto[] = documentationLinks.map(link => ({
      id: link.id,
      wikiPageId: link.wikiPageId,
      order: link.order,
      createdAt: link.createdAt.toISOString(),
      wikiPage: {
        id: link.wikiPage.id,
        title: link.wikiPage.title,
        slug: link.wikiPage.slug,
        workspace_type: link.wikiPage.workspace_type,
        updatedAt: link.wikiPage.updatedAt.toISOString()
      }
    }))

    return NextResponse.json(docs)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// POST /api/projects/[projectId]/documentation - Attach a doc to a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    console.log('[ProjectDocumentation] POST: Starting attachment process')
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['MEMBER'] })
    setWorkspaceContext(auth.workspaceId)
    console.log('[ProjectDocumentation] POST: Auth successful, userId:', auth.user.userId)
    const resolvedParams = await params
    const projectId = resolvedParams.projectId

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    console.log('[ProjectDocumentation] POST: Checking project access for projectId:', projectId)
    // Check project access (require MEMBER or higher to attach docs)
    const nextAuthUser = {
      id: auth.user.userId,
      email: auth.user.email,
      name: auth.user.name
    } as any
    // CRITICAL: Pass workspaceId to ensure workspace isolation
    await assertProjectAccess(nextAuthUser, projectId, ProjectRole.MEMBER, auth.workspaceId)
    console.log('[ProjectDocumentation] POST: Project access granted')

    // Validate request body
    console.log('[ProjectDocumentation] POST: Parsing request body')
    const body = await request.json()
    console.log('[ProjectDocumentation] POST: Request body:', body)
    const validatedData = AttachDocumentationSchema.parse(body)
    const { wikiPageId } = validatedData
    console.log('[ProjectDocumentation] POST: Validated wikiPageId:', wikiPageId)

    // Verify project exists and get workspaceId
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, workspaceId: true }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Verify wiki page exists and belongs to the same workspace
    const wikiPage = await prisma.wikiPage.findUnique({
      where: { id: wikiPageId },
      select: {
        id: true,
        workspaceId: true,
        title: true,
        slug: true,
        workspace_type: true,
        updatedAt: true
      }
    })

    if (!wikiPage) {
      return NextResponse.json({ error: 'Wiki page not found' }, { status: 404 })
    }

    if (wikiPage.workspaceId !== project.workspaceId) {
      return NextResponse.json({
        error: 'Wiki page must belong to the same workspace as the project'
      }, { status: 400 })
    }

    // Check if already attached (unique constraint will prevent duplicates, but we can handle gracefully)
    const existing = await prisma.projectDocumentation.findUnique({
      where: {
        projectId_wikiPageId: {
          projectId,
          wikiPageId
        }
      }
    })

    if (existing) {
      // Return existing record
      const existingWithPage = await prisma.projectDocumentation.findUnique({
        where: { id: existing.id },
        include: {
          wikiPage: {
            select: {
              id: true,
              title: true,
              slug: true,
              workspace_type: true,
              updatedAt: true
            }
          }
        }
      })

      if (existingWithPage) {
        return NextResponse.json({
          id: existingWithPage.id,
          wikiPageId: existingWithPage.wikiPageId,
          order: existingWithPage.order,
          createdAt: existingWithPage.createdAt.toISOString(),
          wikiPage: {
            id: existingWithPage.wikiPage.id,
            title: existingWithPage.wikiPage.title,
            slug: existingWithPage.wikiPage.slug,
            workspace_type: existingWithPage.wikiPage.workspace_type,
            updatedAt: existingWithPage.wikiPage.updatedAt.toISOString()
          }
        })
      }
    }

    // Get max order for this project to append at the end
    console.log('[ProjectDocumentation] POST: Getting max order for project')
    const maxOrder = await prisma.projectDocumentation.aggregate({
      where: { projectId },
      _max: { order: true }
    })

    const newOrder = (maxOrder._max.order ?? -1) + 1
    console.log('[ProjectDocumentation] POST: New order will be:', newOrder)

    // Create new documentation link
    const newLink = await prisma.projectDocumentation.create({
      data: {
        projectId,
        wikiPageId,
        order: newOrder,
        workspaceId: auth.workspaceId
      },
      include: {
        wikiPage: {
          select: {
            id: true,
            title: true,
            slug: true,
            workspace_type: true,
            updatedAt: true
          }
        }
      }
    })

    const doc: ProjectDocumentationDto = {
      id: newLink.id,
      wikiPageId: newLink.wikiPageId,
      order: newLink.order,
      createdAt: newLink.createdAt.toISOString(),
      wikiPage: {
        id: newLink.wikiPage.id,
        title: newLink.wikiPage.title,
        slug: newLink.wikiPage.slug,
        workspace_type: newLink.wikiPage.workspace_type,
        updatedAt: newLink.wikiPage.updatedAt.toISOString()
      }
    }

    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    return handleApiError(error, request)
  }
}

