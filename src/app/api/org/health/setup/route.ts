import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { computeOrgHealthCompleteness } from "@/server/org/health/setup/completeness"

export async function GET(request: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(request)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" })
    setWorkspaceContext(workspaceId)

    const data = await computeOrgHealthCompleteness(workspaceId)
    return NextResponse.json(data)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
