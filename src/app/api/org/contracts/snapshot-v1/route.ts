import { NextResponse } from "next/server"
import { requireActiveOrgId } from "@/server/org/context"
import { buildOrgSnapshotV1 } from "@/server/org/contracts/build-org-snapshot-v1"

export const revalidate = 30

export async function GET() {
  try {
    const orgId = await requireActiveOrgId()
    const snapshot = await buildOrgSnapshotV1(orgId)
    return NextResponse.json({ ok: true, snapshot })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

