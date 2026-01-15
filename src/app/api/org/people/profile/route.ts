import { NextResponse } from "next/server"
import { requireActiveOrgId } from "@/server/org/context"
import { getPersonProfile } from "@/server/org/people/profile"

export async function GET(req: Request) {
  try {
    const orgId = await requireActiveOrgId()
    const url = new URL(req.url)
    const personId = String(url.searchParams.get("id") ?? "")
    if (!personId) return NextResponse.json({ error: "id required" }, { status: 400 })
    const profile = await getPersonProfile(orgId, personId)
    if (!profile) return NextResponse.json({ error: "not found" }, { status: 404 })
    return NextResponse.json({ ok: true, profile })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

