import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { findUnownedEntities } from "@/server/org/health/ownership/scan"
import { isOrgOwnershipEnabled } from "@/lib/org/feature-flags"

export async function GET(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" })
    setWorkspaceContext(workspaceId)

    // Check if ownership feature is enabled
    const ownershipEnabled = await isOrgOwnershipEnabled(workspaceId)
    if (!ownershipEnabled) {
      return NextResponse.json(
        { error: "Ownership features are not enabled for this workspace." },
        { status: 403 }
      )
    }
    const url = new URL(req.url)
    const type = (url.searchParams.get("type") ?? "").toUpperCase()
    const take = Math.max(1, Math.min(50, Number(url.searchParams.get("take") ?? 10)))

    const unowned = await findUnownedEntities(workspaceId)
    const filtered = type ? unowned.filter((u) => String(u.entityType).toUpperCase() === type) : unowned
    return NextResponse.json({ unowned: filtered.slice(0, take) })
  } catch (error) {
    return handleApiError(error, req)
  }
}
