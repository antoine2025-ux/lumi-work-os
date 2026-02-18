import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { dedupAllImportTables } from "@/server/org/maintenance/dedup"

export async function POST(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace", requireRole: ["OWNER", "ADMIN"] })
    setWorkspaceContext(workspaceId)

    const results = await dedupAllImportTables(workspaceId)
    return NextResponse.json({ ok: true, results })
  } catch (error) {
    return handleApiError(error, req)
  }
}
