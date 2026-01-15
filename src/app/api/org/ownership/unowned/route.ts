import { NextRequest, NextResponse } from "next/server"
import { requireActiveOrgId } from "@/server/org/context"
import { findUnownedEntities } from "@/server/org/health/ownership/scan"
import { isOrgOwnershipEnabled } from "@/lib/org/feature-flags"

export async function GET(req: NextRequest) {
  try {
    const orgId = await requireActiveOrgId(req)
    
    // Check if ownership feature is enabled
    const ownershipEnabled = await isOrgOwnershipEnabled(orgId)
    if (!ownershipEnabled) {
      return NextResponse.json(
        { error: "Ownership features are not enabled for this workspace." },
        { status: 403 }
      )
    }
    const url = new URL(req.url)
    const type = (url.searchParams.get("type") ?? "").toUpperCase()
    const take = Math.max(1, Math.min(50, Number(url.searchParams.get("take") ?? 10)))

    const unowned = await findUnownedEntities(orgId)
    const filtered = type ? unowned.filter((u) => String(u.entityType).toUpperCase() === type) : unowned
    return NextResponse.json({ unowned: filtered.slice(0, take) })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

