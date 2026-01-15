import { prisma } from "@/lib/db"

export type EntityType = "TEAM" | "DOMAIN" | "SYSTEM"

export async function listEntitiesForOrg(orgId: string, type: EntityType) {
  if (type === "TEAM") {
    const rows = await prisma.orgTeam?.findMany?.({
      where: { workspaceId: orgId, isActive: true } as any,
      select: { id: true, name: true } as any,
      take: 2000,
      orderBy: { createdAt: "desc" } as any,
    } as any).catch(() => [] as any[])
    return (rows || []).map((r: any) => ({ id: String(r.id), label: String(r.name ?? `Team ${String(r.id).slice(0, 8)}`) }))
  }

  if (type === "DOMAIN") {
    const rows = await prisma.domain?.findMany?.({
      where: { orgId } as any,
      select: { id: true, name: true } as any,
      take: 2000,
      orderBy: { createdAt: "desc" } as any,
    } as any).catch(() => [] as any[])
    return (rows || []).map((r: any) => ({ id: String(r.id), label: String(r.name ?? `Domain ${String(r.id).slice(0, 8)}`) }))
  }

  // SYSTEM
  const rows = await prisma.systemEntity?.findMany?.({
    where: { orgId } as any,
    select: { id: true, name: true } as any,
    take: 2000,
    orderBy: { createdAt: "desc" } as any,
  } as any).catch(() => [] as any[])
  return (rows || []).map((r: any) => ({ id: String(r.id), label: String(r.name ?? `System ${String(r.id).slice(0, 8)}`) }))
}

