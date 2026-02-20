import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertWriteAllowed } from "@/server/org/writes/guard"

type Body = {
  entityType: "TEAM" | "DOMAIN" | "SYSTEM"
  ownerPersonId: string
  entityIds: string[]
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req)
    const workspaceId = auth.workspaceId
    if (!workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
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
      where: { workspaceId, entityType: entityType as any, entityId: { in: entityIds }, isPrimary: true } as any,
      data: { isPrimary: false },
    })

    // Create new primaries
    await prisma.ownerAssignment.createMany({
      data: entityIds.map((id) => ({
        workspaceId,
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
        orgId: workspaceId,
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

