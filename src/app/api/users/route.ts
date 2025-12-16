import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from '@/lib/unified-auth'

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const auth = await getUnifiedAuth(request)
    
    // Get all users (filtered to users in the current workspace)
    const users = await prisma.user.findMany({
      where: {
        workspaceMemberships: {
          some: {
            workspaceId: auth.workspaceId
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    
    // Handle auth errors
    if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('No workspace found'))) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}
