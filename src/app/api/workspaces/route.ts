import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from '@/lib/unified-auth'
import { prisma } from "@/lib/db"
import { WorkspaceRole } from "@prisma/client"
import { logOrgAuditEvent } from "@/server/audit/orgAudit"
import { handleApiError } from '@/lib/api-errors'
import { ensureOrgPositionForUser } from '@/lib/org/ensure-org-position'
import { CreateWorkspaceAltSchema } from '@/lib/validations/workspace'

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Get all workspaces where user has a WorkspaceMember record
    // PHASE 1: Use explicit select to exclude employmentStatus
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: auth.user.userId },
      select: {
        id: true,
        workspaceId: true,
        userId: true,
        role: true,
        joinedAt: true,
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            createdAt: true,
            updatedAt: true
          }
        }
        // Exclude employmentStatus - may not exist in database yet
      },
      orderBy: {
        joinedAt: 'asc' // Return oldest membership first (consistent ordering)
      }
    })

    // Map to response shape (preserve all existing fields)
    const workspaces = memberships.map(m => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      description: m.workspace.description,
      createdAt: m.workspace.createdAt,
      updatedAt: m.workspace.updatedAt,
      userRole: m.role
    }))

    return NextResponse.json({ workspaces })
  } catch (error: unknown) {
    console.error("Error fetching workspaces:", error)
    // If user is not authenticated, return empty array
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ workspaces: [] })
    }
    return NextResponse.json({ workspaces: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    const body = CreateWorkspaceAltSchema.parse(await request.json())
    const { name, description, slug } = body

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      )
    }

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

      // Add creator as owner inside transaction
      const membership = await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: auth.user.userId,
          role: WorkspaceRole.OWNER
        }
      })

      await ensureOrgPositionForUser(tx, {
        workspaceId: workspace.id,
        userId: auth.user.userId,
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

      // Initialize onboarding state for new workspace
      await tx.workspaceOnboardingState.create({
        data: {
          workspaceId: workspace.id,
          profileSetup: false,
          orgStructure: false,
          firstDepartment: false,
          firstTeam: false,
          firstInvite: false,
        },
      })

      return workspace
    })

    return NextResponse.json({ workspace: result })
  } catch (error: unknown) {
    console.error("Error creating workspace:", error)
    return handleApiError(error, request)
  }
}
