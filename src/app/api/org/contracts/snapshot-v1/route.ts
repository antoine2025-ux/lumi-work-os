import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { buildOrgSnapshotV1 } from "@/server/org/contracts/build-org-snapshot-v1"

export const revalidate = 30

export async function GET(request: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(request)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" })
    setWorkspaceContext(workspaceId)

    const snapshot = await buildOrgSnapshotV1(workspaceId)
    return NextResponse.json({ ok: true, snapshot })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
