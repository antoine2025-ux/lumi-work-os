import { prisma } from "@/lib/db"

export type PersonIdentity = {
  id: string
  label: string
  email: string | null
}

export async function getPeopleIdentityMap(orgId: string): Promise<Map<string, PersonIdentity>> {
  // In this codebase, people are represented via OrgPosition with User
  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId: orgId,
      isActive: true,
      userId: { not: null },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    take: 50000,
  })

  const map = new Map<string, PersonIdentity>()
  for (const pos of positions) {
    if (!pos.user) continue
    const id = String(pos.user.id)
    const label = String(pos.user.name ?? pos.user.email ?? `Person ${id.slice(0, 8)}`)
    const email = pos.user.email ? String(pos.user.email) : null
    map.set(id, { id, label, email })
  }
  return map
}

