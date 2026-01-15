import { prisma } from "@/lib/db"

export async function computeOwnershipCoverageScore(orgId: string): Promise<number | null> {
  // Coverage % = entities with a primary owner / total entities (teams + domains + systems)
  const [teamCount, domainCount, systemCount] = await Promise.all([
    prisma.orgTeam?.count?.({ where: { workspaceId: orgId } } as any).catch(() => 0),
    prisma.domain?.count?.({ where: { orgId } } as any).catch(() => 0),
    prisma.systemEntity?.count?.({ where: { orgId } } as any).catch(() => 0),
  ])

  const total = Number(teamCount ?? 0) + Number(domainCount ?? 0) + Number(systemCount ?? 0)
  if (total <= 0) return null

  let owned = 0
  try {
    if (prisma.ownerAssignment && typeof (prisma.ownerAssignment as any).count === "function") {
      owned = await (prisma.ownerAssignment as any).count({
        where: {
          orgId,
          isPrimary: true,
          entityType: { in: ["TEAM", "DOMAIN", "SYSTEM"] as any },
        } as any,
      } as any).catch((error: any) => {
        if (error?.code === "P2021" || error?.message?.includes("does not exist")) {
          return 0
        }
        return 0
      })
    }
  } catch {
    owned = 0
  }

  // owned count can exceed total if duplicates exist; clamp
  const pct = Math.max(0, Math.min(100, Math.round((owned / total) * 100)))
  return pct
}

