import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { WorkspaceRole } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    // Temporarily bypass auth for development
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    // For development, get all workspaces (bypass user-specific filtering)
    const userWorkspaces = await prisma.workspaceMember.findMany({
      include: {
        workspace: true
      }
    })

    const workspaces = userWorkspaces.map(membership => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      description: membership.workspace.description,
      createdAt: membership.workspace.createdAt,
      updatedAt: membership.workspace.updatedAt,
      userRole: membership.role
    }))

    return NextResponse.json({ workspaces })
  } catch (error) {
    console.error("Error fetching workspaces:", error)
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("Starting workspace creation...")
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.log("No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Session found for user:", session.user.id)
    
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
    
    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug: finalSlug,
        description,
        ownerId: session.user.id
      }
    })

    console.log("Workspace created:", workspace.id)

    // Add creator as owner
    console.log("Adding user as workspace member...")
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        role: WorkspaceRole.OWNER
      }
    })

    console.log("Workspace creation completed successfully")
    return NextResponse.json({ workspace })
  } catch (error) {
    console.error("Error creating workspace:", error)
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    )
  }
}
