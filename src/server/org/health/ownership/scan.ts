import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"

type UnownedEntity = {
  entityType: "TEAM" | "DOMAIN" | "PROJECT" | "SYSTEM"
  entityId: string
  entityLabel: string
}

export async function findUnownedEntities(workspaceId: string): Promise<UnownedEntity[]> {
  // Fetch owner assignments with error handling.
  // OwnerAssignment uses workspaceId.
  let assignments: Array<{ entityType: string; entityId: string }> = []
  try {
    assignments = await prisma.ownerAssignment.findMany({
      where: { workspaceId, isPrimary: true },
      select: { entityType: true, entityId: true },
      take: 50000,
    })
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      console.warn("[findUnownedEntities] owner_assignments table does not exist");
    } else if (
      error instanceof Error &&
      error.message.includes("does not exist")
    ) {
      console.warn("[findUnownedEntities] owner_assignments table does not exist");
    } else {
      console.error("[findUnownedEntities] Error fetching owner assignments:", error instanceof Error ? error.message : error);
    }
    assignments = []
  }

  const owned = new Set(assignments.map((a) => `${a.entityType}::${a.entityId}`))

  const [teams, domains, systems] = await Promise.all([
    prisma.orgTeam.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
      take: 5000,
    }).catch(() => []),

    prisma.domain.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
      take: 5000,
    }).catch(() => []),

    prisma.systemEntity.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
      take: 5000,
    }).catch(() => []),
  ])

  const unowned: UnownedEntity[] = []

  for (const t of teams) {
    if (!owned.has(`TEAM::${t.id}`)) {
      unowned.push({ entityType: "TEAM", entityId: t.id, entityLabel: t.name ?? "Untitled team" })
    }
  }

  for (const d of domains) {
    if (!owned.has(`DOMAIN::${d.id}`)) {
      unowned.push({ entityType: "DOMAIN", entityId: d.id, entityLabel: d.name ?? "Untitled domain" })
    }
  }

  for (const s of systems) {
    if (!owned.has(`SYSTEM::${s.id}`)) {
      unowned.push({ entityType: "SYSTEM", entityId: s.id, entityLabel: s.name ?? "Untitled system" })
    }
  }

  return unowned
}
