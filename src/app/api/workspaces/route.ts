import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from '@/lib/unified-auth'
import { prisma } from "@/lib/db"
import { WorkspaceRole } from "@prisma/client"
import { logOrgAuditEvent } from "@/server/audit/orgAudit"

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // If no workspace ID, user needs to create a workspace
    if (!auth.workspaceId) {
      return NextResponse.json({ workspaces: [] })
    }
    
    // Get the workspace details
    const workspace = await prisma.workspace.findUnique({
      where: { id: auth.workspaceId },
      include: {
        members: {
          where: { userId: auth.user.userId },
          select: { role: true }
        }
      }
    })

    if (!workspace) {
      return NextResponse.json({ workspaces: [] })
    }

    const userRole = workspace.members[0]?.role || 'MEMBER'

    const workspaceData = {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      userRole
    }

    return NextResponse.json({ workspaces: [workspaceData] })
  } catch (error) {
    console.error("Error fetching workspaces:", error)
    // If it's a "no workspace found" error, return empty array
    if (error instanceof Error && error.message.includes('No workspace found')) {
      return NextResponse.json({ workspaces: [] })
    }
    // If user is not authenticated, return empty array
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ workspaces: [] })
    }
    return NextResponse.json({ workspaces: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("Starting workspace creation...")
    const auth = await getUnifiedAuth(request)
    
    console.log("Auth context:", auth)
    
    let body
    try {
      body = await request.json()
      console.log("Request body parsed:", body)
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError)
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }
    
    const { name, description, slug } = body

    console.log("Creating workspace with data:", { name, slug, description })

    if (!name || !slug) {
      console.log("Missing required fields")
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      )
    }

    // Create workspace
    console.log("Creating workspace in database...")
    
    // Check if slug already exists and make it unique if needed
    let finalSlug = slug
    let counter = 1
    while (true) {
      const existingWorkspace = await prisma.workspace.findUnique({
        where: { slug: finalSlug }
      })
      if (!existingWorkspace) break
      finalSlug = `${slug}-${counter}`
      counter++
    }
    
    console.log("Using slug:", finalSlug)
    
    // Create workspace and initial OWNER membership in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
          slug: finalSlug,
          description,
          ownerId: auth.user.userId
        }
      })

      console.log("Workspace created:", workspace.id)

      // Add creator as owner
      console.log("Adding user as workspace member...")
      const membership = await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: auth.user.userId,
          role: WorkspaceRole.OWNER
        }
      })

      // Log workspace creation
      await logOrgAuditEvent(tx as any, {
        workspaceId: workspace.id,
        actorUserId: auth.user.userId,
        targetUserId: auth.user.userId,
        event: "ORG_CREATED",
        metadata: {
          name: workspace.name,
          membershipId: membership.id,
        },
      })

      return workspace
    })

    console.log("Workspace creation completed successfully")
    return NextResponse.json({ workspace: result })
  } catch (error) {
    console.error("Error creating workspace:", error)
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    )
  }
}
