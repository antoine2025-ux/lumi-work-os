// NOTE: Loopbrain consumes Org directly; this endpoint remains for UI/utility.
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireActiveOrgId } from "@/server/org/context"

export async function GET(req: Request) {
  try {
    const orgId = await requireActiveOrgId(req as any)
    const url = new URL(req.url)
    const take = Math.max(1, Math.min(50, Number(url.searchParams.get("take") ?? 20)))

    // In this codebase, orgId is workspaceId, and people are Users with OrgPositions
    const positions = await prisma.orgPosition.findMany({
      where: { workspaceId: orgId, isActive: true, userId: { not: null } } as any,
      select: { userId: true } as any,
      take: 2000,
    })

    const userIds = Array.from(new Set(positions.map((p: any) => String(p.userId)).filter(Boolean)))

    if (userIds.length === 0) {
      return NextResponse.json({ people: [] })
    }

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
      take: 2000,
    })

    const availabilities = await (prisma as any).personAvailabilityHealth.findMany({
      where: { orgId },
      select: { personId: true, status: true, reason: true, updatedAt: true, createdAt: true },
      take: 5000,
    })

    const availMap = new Map<string, typeof availabilities[0]>()
    for (const a of availabilities) {
      availMap.set(String(a.personId), a)
    }

    const out = users.map((u) => {
      const a = availMap.get(String(u.id))
      return {
        personId: String(u.id),
        name: String(u.name ?? ""),
        email: u.email ? String(u.email) : null,
        status: a?.status ?? "AVAILABLE",
        reason: a?.reason ?? null,
        updatedAt: a?.updatedAt ?? a?.createdAt ?? null,
      }
    })

    // Put non-AVAILABLE first
    out.sort((a, b) => {
      const ax = String(a.status).toUpperCase() === "AVAILABLE" ? 1 : 0
      const bx = String(b.status).toUpperCase() === "AVAILABLE" ? 1 : 0
      return ax - bx
    })

    return NextResponse.json({ people: out.slice(0, take) })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

