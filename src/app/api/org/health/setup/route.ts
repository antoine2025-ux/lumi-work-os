import { NextResponse } from "next/server"
import { requireActiveOrgId } from "@/server/org/context"
import { computeOrgHealthCompleteness } from "@/server/org/health/setup/completeness"

export async function GET() {
  try {
    const orgId = await requireActiveOrgId()
    const data = await computeOrgHealthCompleteness(orgId)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

