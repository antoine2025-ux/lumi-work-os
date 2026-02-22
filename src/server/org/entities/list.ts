import { prisma } from "@/lib/db"

export type EntityType = "TEAM" | "DOMAIN" | "SYSTEM"

type EntityRow = { id: string; name: string }

export async function listEntitiesForOrg(orgId: string, type: EntityType) {
  if (type === "TEAM") {
    const rows: EntityRow[] = await prisma.orgTeam.findMany({
      where: { workspaceId: orgId, isActive: true },
      select: { id: true, name: true },
      take: 2000,
      orderBy: { createdAt: "desc" },
    }).catch(() => [] as EntityRow[])
    return (rows || []).map((r) => ({ id: String(r.id), label: String(r.name ?? `Team ${String(r.id).slice(0, 8)}`) }))
  }

  if (type === "DOMAIN") {
    const rows: EntityRow[] = await prisma.domain.findMany({
      where: { orgId },
      select: { id: true, name: true },
      take: 2000,
      orderBy: { createdAt: "desc" },
    }).catch(() => [] as EntityRow[])
    return (rows || []).map((r) => ({ id: String(r.id), label: String(r.name ?? `Domain ${String(r.id).slice(0, 8)}`) }))
  }

  // SYSTEM
  const rows: EntityRow[] = await prisma.systemEntity.findMany({
    where: { orgId },
    select: { id: true, name: true },
    take: 2000,
    orderBy: { createdAt: "desc" },
  }).catch(() => [] as EntityRow[])
  return (rows || []).map((r) => ({ id: String(r.id), label: String(r.name ?? `System ${String(r.id).slice(0, 8)}`) }))
}
