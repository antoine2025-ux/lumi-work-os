import { prisma } from "@/lib/db"

type DedupResult = { table: string; removed: number }

export async function dedupManagerLinks(orgId: string): Promise<DedupResult> {
  // PersonManagerLink unique: (workspaceId, personId, managerId)
  const rows = await prisma.personManagerLink.findMany({
    where: { workspaceId: orgId },
    select: { id: true, personId: true, managerId: true, createdAt: true },
    take: 200000,
    orderBy: { createdAt: "asc" },
  })

  const seen = new Set<string>()
  const toDelete: string[] = []

  for (const r of rows) {
    const key = `${r.personId}::${r.managerId}`
    if (seen.has(key)) toDelete.push(String(r.id))
    else seen.add(key)
  }

  if (toDelete.length === 0) return { table: "PersonManagerLink", removed: 0 }

  await prisma.personManagerLink.deleteMany({
    where: { id: { in: toDelete } },
  })

  return { table: "PersonManagerLink", removed: toDelete.length }
}

export async function dedupCapacity(orgId: string): Promise<DedupResult> {
  // PersonCapacity unique: (orgId, personId)
  const rows = await prisma.personCapacity.findMany({
    where: { orgId },
    select: { id: true, personId: true, createdAt: true },
    take: 200000,
    orderBy: { createdAt: "desc" }, // keep newest
  })

  const seen = new Set<string>()
  const toDelete: string[] = []

  for (const r of rows) {
    const key = String(r.personId)
    if (seen.has(key)) toDelete.push(String(r.id))
    else seen.add(key)
  }

  if (toDelete.length === 0) return { table: "PersonCapacity", removed: 0 }

  await prisma.personCapacity.deleteMany({ where: { id: { in: toDelete } } })
  return { table: "PersonCapacity", removed: toDelete.length }
}

export async function dedupAvailability(orgId: string): Promise<DedupResult> {
  // PersonAvailability unique: (workspaceId, personId)
  const rows = await prisma.personAvailability.findMany({
    where: { workspaceId: orgId },
    select: { id: true, personId: true, createdAt: true },
    take: 200000,
    orderBy: { createdAt: "desc" }, // keep newest
  })

  const seen = new Set<string>()
  const toDelete: string[] = []

  for (const r of rows) {
    const key = String(r.personId)
    if (seen.has(key)) toDelete.push(String(r.id))
    else seen.add(key)
  }

  if (toDelete.length === 0) return { table: "PersonAvailability", removed: 0 }

  await prisma.personAvailability.deleteMany({ where: { id: { in: toDelete } } })
  return { table: "PersonAvailability", removed: toDelete.length }
}

export async function dedupRoles(orgId: string): Promise<DedupResult> {
  // PersonRoleAssignment unique: (orgId, personId, role)
  const rows = await prisma.personRoleAssignment.findMany({
    where: { orgId },
    select: { id: true, personId: true, role: true, createdAt: true },
    take: 200000,
    orderBy: { createdAt: "desc" }, // keep newest
  })

  const seen = new Set<string>()
  const toDelete: string[] = []

  for (const r of rows) {
    const key = `${r.personId}::${String(r.role)}`
    if (seen.has(key)) toDelete.push(String(r.id))
    else seen.add(key)
  }

  if (toDelete.length === 0) return { table: "PersonRoleAssignment", removed: 0 }

  await prisma.personRoleAssignment.deleteMany({ where: { id: { in: toDelete } } })
  return { table: "PersonRoleAssignment", removed: toDelete.length }
}

export async function dedupAllImportTables(orgId: string) {
  const results: DedupResult[] = []
  results.push(await dedupManagerLinks(orgId))
  results.push(await dedupCapacity(orgId))
  results.push(await dedupAvailability(orgId))
  results.push(await dedupRoles(orgId))
  return results
}
