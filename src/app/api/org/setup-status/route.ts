import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { getOrgSetupStatus } from "@/server/org/setup/status"

export async function GET(request: NextRequest) {
  let userId: string | undefined
  let workspaceId: string | undefined

  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request)
    userId = auth?.user?.userId
    workspaceId = auth?.workspaceId

    if (!userId || !workspaceId) {
      console.error("[GET /api/org/setup-status] Missing userId or workspaceId", { userId, workspaceId })
      // Return empty state instead of 401 for MVP
      return NextResponse.json(
        { 
          ok: true,
          status: {
            status: "NO_WORKSPACE",
            items: [],
            ready: false,
          },
          hint: "No workspace found. Please create or join a workspace."
        },
        { status: 200 }
      )
    }

    // Step 2: Assert access (verifies workspace membership and role)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    })

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId)

    // Step 4: Get setup status
    const setupData = await getOrgSetupStatus(workspaceId)
    
    // Transform to expected format
    const items = [
      {
        key: "people_added",
        label: "People added",
        complete: setupData.peopleCount > 0,
      },
      {
        key: "structure_defined",
        label: "Structure defined",
        complete: setupData.teamCount > 0,
      },
      {
        key: "roles_complete",
        label: "Roles complete",
        complete: setupData.rolesComplete,
      },
      {
        key: "teams_complete",
        label: "Teams complete",
        complete: setupData.teamsComplete,
      },
    ]
    
    const status = {
      status: setupData.setupIncomplete ? "INCOMPLETE" : "COMPLETE",
      items,
      ready: !setupData.setupIncomplete,
    }
    return NextResponse.json({ ok: true, status })
  } catch (error: any) {
    console.error("[GET /api/org/setup-status] Error:", error)
    console.error("[GET /api/org/setup-status] Error stack:", error?.stack)

    // Return empty state instead of error for MVP
    if (!userId || !workspaceId) {
      return NextResponse.json(
        { 
          ok: true,
          status: {
            status: "NO_WORKSPACE",
            items: [],
            ready: false,
          },
          hint: "No workspace found. Please create or join a workspace."
        },
        { status: 200 }
      )
    }

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { 
          ok: true,
          status: {
            status: "NO_ACCESS",
            items: [],
            ready: false,
          },
          hint: error.message || "You don't have permission to access this resource."
        },
        { status: 200 }
      )
    }

    // Return empty state on any error
    return NextResponse.json(
      { 
        ok: true,
        status: {
          status: "ERROR",
          items: [],
          ready: false,
        },
        hint: error?.message || "Failed to load setup status."
      },
      { status: 200 }
    )
  }
}

