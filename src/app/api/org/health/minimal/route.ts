import { NextResponse } from "next/server"
import { requireActiveOrgId } from "@/server/org/context"
import { computeMinimalOrgHealth } from "@/server/org/health/compute-minimal"

export async function GET() {
  try {
    const orgId = await requireActiveOrgId()
    const data = await computeMinimalOrgHealth(orgId)
    return NextResponse.json({ ok: true, ...data })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

