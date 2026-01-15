import { prisma } from "@/lib/db"

type UnownedEntity = {
  entityType: "TEAM" | "DOMAIN" | "PROJECT" | "SYSTEM"
  entityId: string
  entityLabel: string
}

export async function findUnownedEntities(orgId: string): Promise<UnownedEntity[]> {
  // Ensure Prisma client is connected
  try {
    await prisma.$connect().catch(() => {})
  } catch {
    // Ignore connection errors
  }

  // Fetch owner assignments with error handling
  let assignments: any[] = []
  try {
    // Try direct access first (should work after Prisma regeneration)
    if (prisma.ownerAssignment && typeof (prisma.ownerAssignment as any).findMany === "function") {
      assignments = await (prisma.ownerAssignment as any).findMany({
        where: { orgId, isPrimary: true } as any,
        select: { entityType: true, entityId: true } as any,
        take: 50000,
      } as any).catch((error: any) => {
        if (error?.code === "P2021" || error?.message?.includes("does not exist")) {
          console.warn("[findUnownedEntities] owner_assignments table does not exist");
          return [] as any[]
        }
        throw error
      })
    } else {
      // Fallback: try accessing via any cast
      const model = (prisma as any).ownerAssignment
      if (model && typeof model.findMany === "function") {
        assignments = await model.findMany({
          where: { orgId, isPrimary: true } as any,
          select: { entityType: true, entityId: true } as any,
          take: 50000,
        } as any).catch((error: any) => {
          if (error?.code === "P2021" || error?.message?.includes("does not exist")) {
            console.warn("[findUnownedEntities] owner_assignments table does not exist");
            return [] as any[]
          }
          throw error
        })
      } else {
        console.warn("[findUnownedEntities] ownerAssignment model not found, returning empty list")
        return []
      }
    }
  } catch (error: any) {
    console.error("[findUnownedEntities] Error fetching owner assignments:", error?.message || error)
    // Return empty array on error to allow page to render
    assignments = []
  }

  const owned = new Set(assignments.map((a: any) => `${String(a.entityType)}::${String(a.entityId)}`))

  const [teams, domains, systems] = await Promise.all([
    prisma.orgTeam?.findMany?.({
      where: { workspaceId: orgId },
      select: { id: true, name: true } as any,
      take: 5000,
    } as any).catch(() => [] as any[]),

    prisma.domain?.findMany?.({
      where: { orgId } as any,
      select: { id: true, name: true } as any,
      take: 5000,
    } as any).catch(() => [] as any[]),

    prisma.systemEntity?.findMany?.({
      where: { orgId } as any,
      select: { id: true, name: true } as any,
      take: 5000,
    } as any).catch(() => [] as any[]),
  ])

  const unowned: UnownedEntity[] = []

  for (const t of teams || []) {
    const id = String((t as any).id)
    if (!owned.has(`TEAM::${id}`)) {
      unowned.push({ entityType: "TEAM", entityId: id, entityLabel: String((t as any).name ?? "Untitled team") })
    }
  }

  for (const d of domains || []) {
    const id = String((d as any).id)
    if (!owned.has(`DOMAIN::${id}`)) {
      unowned.push({ entityType: "DOMAIN", entityId: id, entityLabel: String((d as any).name ?? "Untitled domain") })
    }
  }

  for (const s of systems || []) {
    const id = String((s as any).id)
    if (!owned.has(`SYSTEM::${id}`)) {
      unowned.push({ entityType: "SYSTEM", entityId: id, entityLabel: String((s as any).name ?? "Untitled system") })
    }
  }

  return unowned
}

