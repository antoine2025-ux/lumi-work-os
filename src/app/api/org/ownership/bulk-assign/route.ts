import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/db"
import { requireActiveOrgId } from "@/server/org/context"
import { assertWriteAllowed } from "@/server/org/writes/guard"

type Body = {
  entityType: "TEAM" | "DOMAIN" | "SYSTEM"
  ownerPersonId: string
  entityIds: string[]
}

export async function POST(req: NextRequest) {
  try {
    const orgId = await requireActiveOrgId(req)
    assertWriteAllowed("ownership.bulkAssign")
    const body = (await req.json()) as Body

    const entityType = String(body.entityType ?? "").toUpperCase()
    const ownerPersonId = String(body.ownerPersonId ?? "")
    const entityIds = Array.isArray(body.entityIds) ? body.entityIds.map(String) : []

    if (!ownerPersonId || !entityIds.length) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }
    if (entityType !== "TEAM" && entityType !== "DOMAIN" && entityType !== "SYSTEM") {
      return NextResponse.json({ error: "Invalid entityType" }, { status: 400 })
    }

    // Demote existing primaries
    await prisma.ownerAssignment.updateMany({
      where: { orgId, entityType: entityType as any, entityId: { in: entityIds }, isPrimary: true } as any,
      data: { isPrimary: false },
    })

    // Create new primaries
    await prisma.ownerAssignment.createMany({
      data: entityIds.map((id) => ({
        orgId,
        entityType: entityType as any,
        entityId: id,
        ownerPersonId,
        isPrimary: true,
      })),
      skipDuplicates: true as any,
    })

    // Resolve matching OWNERSHIP signals for those entities only
    await prisma.orgHealthSignal.updateMany({
      where: {
        orgId,
        type: "OWNERSHIP" as any,
        resolvedAt: null,
        dismissedAt: null,
        contextType: entityType,
        contextId: { in: entityIds },
      } as any,
      data: { resolvedAt: new Date() },
    })

    revalidateTag("org:ownership")
    revalidateTag("org:health")
    revalidateTag("org:contracts")

    return NextResponse.json({ ok: true, count: entityIds.length })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

