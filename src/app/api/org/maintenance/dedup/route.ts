import { NextRequest, NextResponse } from "next/server"
import { requireActiveOrgId } from "@/server/org/context"
import { dedupAllImportTables } from "@/server/org/maintenance/dedup"

export async function POST(req: NextRequest) {
  try {
    const orgId = await requireActiveOrgId(req)
    const results = await dedupAllImportTables(orgId)
    return NextResponse.json({ ok: true, results })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

