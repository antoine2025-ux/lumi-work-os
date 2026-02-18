import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { listEntitiesForOrg } from "@/server/org/entities/list"

export async function GET(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" })
    setWorkspaceContext(workspaceId)

    const url = new URL(req.url)
    const type = String(url.searchParams.get("type") ?? "").toUpperCase()
    if (type !== "TEAM" && type !== "DOMAIN" && type !== "SYSTEM") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }

    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase()
    const all = await listEntitiesForOrg(workspaceId, type as any)
    const filtered = q ? all.filter((e) => e.label.toLowerCase().includes(q)) : all
    return NextResponse.json({ entities: filtered.slice(0, 80) })
  } catch (error) {
    return handleApiError(error, req)
  }
}
