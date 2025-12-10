import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from "@/lib/db"

// GET /api/workspaces/[workspaceId]/members - List workspace members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    const auth = await getUnifiedAuth(request)
    
    // Ensure workspaceId from route matches auth context
    if (auth.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID mismatch" },
        { status: 403 }
      )
    }
    
    // Assert user has MEMBER role or higher to list members
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(workspaceId)

    // Get all members with user info
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: {
        joinedAt: 'asc'
      }
    })

    // Map to response shape
    const membersList = members.map(m => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      user: {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image
      }
    }))

    return NextResponse.json({ members: membersList })
  } catch (error) {
    console.error("Error fetching members:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: "Failed to fetch members", details: errorMessage },
      { status: 500 }
    )
  }
}
