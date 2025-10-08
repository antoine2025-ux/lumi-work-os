import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { workspaceId } = await params

    // Get user's role in the workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: session.user.id
        }
      }
    })

    if (!membership) {
      return NextResponse.json({ error: "User not found in workspace" }, { status: 404 })
    }

    return NextResponse.json({ 
      role: membership.role,
      joinedAt: membership.joinedAt
    })
  } catch (error) {
    console.error("Error fetching user role:", error)
    return NextResponse.json(
      { error: "Failed to fetch user role" },
      { status: 500 }
    )
  }
}
