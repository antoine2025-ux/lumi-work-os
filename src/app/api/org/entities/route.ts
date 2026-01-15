import { NextRequest, NextResponse } from "next/server"
import { requireActiveOrgId } from "@/server/org/context"
import { listEntitiesForOrg } from "@/server/org/entities/list"

export async function GET(req: NextRequest) {
  try {
    const orgId = await requireActiveOrgId(req)
    const url = new URL(req.url)
    const type = String(url.searchParams.get("type") ?? "").toUpperCase()
    if (type !== "TEAM" && type !== "DOMAIN" && type !== "SYSTEM") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }

    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase()
    const all = await listEntitiesForOrg(orgId, type as any)
    const filtered = q ? all.filter((e) => e.label.toLowerCase().includes(q)) : all
    return NextResponse.json({ entities: filtered.slice(0, 80) })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

