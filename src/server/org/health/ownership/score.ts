import { prisma } from "@/lib/db"
import { OwnedEntityType } from "@prisma/client"

export async function computeOwnershipCoverageScore(workspaceId: string): Promise<number | null> {
  // Coverage % = entities with a primary owner / total entities (teams + domains + systems)
  const [teamCount, domainCount, systemCount] = await Promise.all([
    prisma.orgTeam.count({ where: { workspaceId } }).catch(() => 0),
    prisma.domain.count({ where: { workspaceId } }).catch(() => 0),
    prisma.systemEntity.count({ where: { workspaceId } }).catch(() => 0),
  ])

  const total = Number(teamCount ?? 0) + Number(domainCount ?? 0) + Number(systemCount ?? 0)
  if (total <= 0) return null

  let owned = 0
  try {
    owned = await prisma.ownerAssignment.count({
      where: {
        workspaceId,
        isPrimary: true,
        entityType: { in: [OwnedEntityType.TEAM, OwnedEntityType.DOMAIN, OwnedEntityType.SYSTEM] },
      },
    }).catch((error: unknown) => {
      const err = error as { code?: string; message?: string }
      if (err?.code === "P2021" || err?.message?.includes("does not exist")) {
        return 0
      }
      return 0
    })
  } catch {
    owned = 0
  }

  // owned count can exceed total if duplicates exist; clamp
  const pct = Math.max(0, Math.min(100, Math.round((owned / total) * 100)))
  return pct
}

