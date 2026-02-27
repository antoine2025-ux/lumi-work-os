import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertWorkspaceAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { getPersonProfile } from "@/server/org/people/profile"

export async function GET(req: NextRequest) {
  try {
    // Replace legacy requireActiveOrgId with standard auth pattern
    const auth = await getUnifiedAuth(req)
    await assertWorkspaceAccess(auth.user.userId, auth.workspaceId, ['MEMBER'])
    setWorkspaceContext(auth.workspaceId)
    const workspaceId = auth.workspaceId
    
    const url = new URL(req.url)
    const personId = String(url.searchParams.get("id") ?? "")
    if (!personId) return NextResponse.json({ error: "id required" }, { status: 400 })
    const profile = await getPersonProfile(workspaceId, personId)
    if (!profile) return NextResponse.json({ error: "not found" }, { status: 404 })
    return NextResponse.json({ ok: true, profile })
  } catch (error) {
    return handleApiError(error)
  }
}

